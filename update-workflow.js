const fs = require('fs')
const path = require('path')

const workflowPath = path.join(__dirname, 'workflow.json')
const raw = fs.readFileSync(workflowPath, 'utf-8')
const wf = JSON.parse(raw)

const API_BASE = 'http://host.docker.internal:3456/api'

// =====================================================
// 1. Nodes to remove (file-based I/O and related)
// =====================================================
const nodesToRemove = new Set([
  'Edit Fields10', 'Edit Fields12', 'Edit Fields13', 'Edit Fields14', 'Edit Fields25',
  'Convert to File', 'Convert to File1',
  'Read/Write Files from Disk', 'Read/Write Files from Disk1',
  'Read/Write Files from Disk2', 'Read/Write Files from Disk3',
  'Extract from File', 'Extract from File1',
])

// =====================================================
// 2. New nodes to add
// =====================================================
const newNodes = [
  // --- PUSH NEWS BATCH after Limit1 ---
  // Transform Limit1 items into a batch array
  {
    parameters: {
      jsCode: `const batch = $input.all().map(item => {
  const json = item.json;
  const output = json.output || {};
  const batchId = new Date().toISOString().slice(0, 16).replace('T', '-');
  return {
    title: json.title || output['标题'] || '',
    time: json.time || output['时间'] || '',
    content: json.content || output['内容摘要'] || '',
    link: json.guid || output['链接'] || '',
    source: '',
    ai_score: output['按客户需求进行赋分'] ?? null,
    ai_reason: output['判断理由'] || '',
    batch_id: batchId,
  };
});
return [{ json: batch }];`,
    },
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [2100, 2000],
    id: 'auto-code-batch-news',
    name: 'Transform News Batch',
  },
  {
    parameters: {
      url: `${API_BASE}/news/batch`,
      method: 'POST',
      sendBody: true,
      options: {},
    },
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [2400, 2000],
    id: 'auto-http-news-batch',
    name: 'Push News Batch',
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 2000,
    onError: 'continueRegularOutput',
  },
  // --- PUSH BRIEF after AI Agent2 ---
  {
    parameters: {
      url: `${API_BASE}/brief`,
      method: 'POST',
      sendBody: true,
      options: {},
      bodyParameters: {
        parameters: [
          { name: 'type', value: 'batch' },
          { name: 'title', value: '={{ $json.title }}' },
          { name: 'content', value: '={{ $json.output }}' },
          { name: 'date', value: '={{ $now.toFormat("yyyy-MM-dd") }}' },
        ],
      },
    },
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [6000, 2736],
    id: 'auto-http-push-brief',
    name: 'Push Brief',
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 2000,
    onError: 'continueRegularOutput',
  },
  // --- DAILY TRIGGER: GET accumulated data ---
  {
    parameters: {
      url: `=${API_BASE}/accumulated?date={{ $now.toFormat("yyyy-MM-dd") }}&type=day`,
      method: 'GET',
      sendBody: false,
      options: {},
    },
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [8000, 1008],
    id: 'auto-http-get-daily',
    name: 'GET Daily Data',
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 2000,
    onError: 'continueRegularOutput',
  },
  // Format for AI Agent3
  {
    parameters: {
      jsCode: `const news = $json.news;
if (!news || news.length === 0) {
  return [{ json: { data: '今日无新闻数据' } }];
}
let output = '';
for (const item of news) {
  output += '标题：' + (item.title || '') + '\\n';
  output += '时间：' + (item.time || '') + '\\n';
  output += '来源：' + (item.source || '') + '\\n';
  output += '评分：' + (item.ai_score ?? '') + '\\n';
  output += '内容：' + (item.content || item.summary || '') + '\\n';
  output += '链接：' + (item.link || '') + '\\n\\n';
}
return [{ json: { data: output } }];`,
    },
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [8400, 1008],
    id: 'auto-code-format-daily',
    name: 'Format Daily Data',
  },
  // --- WEEKLY TRIGGER: GET weekly data ---
  {
    parameters: {
      url: `=${API_BASE}/accumulated?date={{ $now.startOf('week').toFormat("yyyy-MM-dd") }}&endDate={{ $now.endOf('week').toFormat("yyyy-MM-dd") }}&type=week`,
      method: 'GET',
      sendBody: false,
      options: {},
    },
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [10000, 96],
    id: 'auto-http-get-weekly',
    name: 'GET Weekly Data',
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 2000,
    onError: 'continueRegularOutput',
  },
  // Format for AI Agent4
  {
    parameters: {
      jsCode: `const news = $json.news;
if (!news || news.length === 0) {
  return [{ json: { data: '本周无新闻数据' } }];
}
let output = '';
for (const item of news) {
  output += '标题：' + (item.title || '') + '\\n';
  output += '时间：' + (item.time || '') + '\\n';
  output += '来源：' + (item.source || '') + '\\n';
  output += '评分：' + (item.ai_score ?? '') + '\\n';
  output += '内容：' + (item.content || item.summary || '') + '\\n';
  output += '链接：' + (item.link || '') + '\\n\\n';
}
return [{ json: { data: output } }];`,
    },
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [10400, 96],
    id: 'auto-code-format-weekly',
    name: 'Format Weekly Data',
  },
]

// =====================================================
// 3. Remove specified nodes
// =====================================================
wf.nodes = wf.nodes.filter(n => !nodesToRemove.has(n.name))

// =====================================================
// 4. Add new nodes
// =====================================================
wf.nodes.push(...newNodes)

// =====================================================
// 5. Remove connections involving deleted nodes
// =====================================================
for (const name of nodesToRemove) {
  delete wf.connections[name]
}

// Clean up connections that point to removed nodes
for (const [fromNode, conns] of Object.entries(wf.connections)) {
  if (conns.main) {
    conns.main = conns.main.map((targets) =>
      targets.filter(t => !nodesToRemove.has(t.node))
    ).filter(arr => arr.length > 0)
    if (conns.main.length === 0) delete conns.main
  }
  // Remove empty connection entries
  if (!conns.main && !conns.ai_languageModel) {
    delete wf.connections[fromNode]
  }
}

// =====================================================
// 6. Rewire daily trigger (Schedule Trigger1)
// =====================================================
wf.connections['Schedule Trigger1'] = {
  main: [
    [{ node: 'GET Daily Data', type: 'main', index: 0 }]
  ]
}
wf.connections['GET Daily Data'] = {
  main: [
    [{ node: 'Format Daily Data', type: 'main', index: 0 }]
  ]
}
wf.connections['Format Daily Data'] = {
  main: [
    [{ node: 'AI Agent3', type: 'main', index: 0 }]
  ]
}

// AI Agent3: keep only Edit Fields52 output
if (wf.connections['AI Agent3'] && wf.connections['AI Agent3'].main) {
  wf.connections['AI Agent3'].main = wf.connections['AI Agent3'].main.map(targets =>
    targets.filter(t => t.node === 'Edit Fields52')
  ).filter(arr => arr.length > 0)
}

// =====================================================
// 7. Rewire weekly trigger (Schedule Trigger2)
// =====================================================
wf.connections['Schedule Trigger2'] = {
  main: [
    [{ node: 'GET Weekly Data', type: 'main', index: 0 }]
  ]
}
wf.connections['GET Weekly Data'] = {
  main: [
    [{ node: 'Format Weekly Data', type: 'main', index: 0 }]
  ]
}
wf.connections['Format Weekly Data'] = {
  main: [
    [{ node: 'AI Agent4', type: 'main', index: 0 }]
  ]
}

// =====================================================
// 8. Add parallel paths from Limit1 and AI Agent2
// =====================================================
// Limit1 → Transform News Batch (parallel to existing Edit Fields8)
if (wf.connections['Limit1'] && wf.connections['Limit1'].main?.[0]) {
  wf.connections['Limit1'].main[0].push(
    { node: 'Transform News Batch', type: 'main', index: 0 }
  )
}
wf.connections['Transform News Batch'] = {
  main: [
    [{ node: 'Push News Batch', type: 'main', index: 0 }]
  ]
}
wf.connections['Push News Batch'] = { main: [[]] }

// AI Agent2 → Push Brief (parallel to existing Merge6)
if (wf.connections['AI Agent2'] && wf.connections['AI Agent2'].main?.[0]) {
  wf.connections['AI Agent2'].main[0].push(
    { node: 'Push Brief', type: 'main', index: 0 }
  )
}
wf.connections['Push Brief'] = { main: [[]] }

// =====================================================
// 9. Write output
// =====================================================
const output = JSON.stringify(wf, null, 2)
fs.writeFileSync(workflowPath, output, 'utf-8')
console.log('workflow.json updated successfully')
console.log(`Nodes: ${wf.nodes.length} (removed ${nodesToRemove.size})`)
