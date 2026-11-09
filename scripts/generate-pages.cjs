// Shared asset links, independent HTML entries and page controllers.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../dist');
const {modules}=require('../dist/assets/js/work-catalog.js');
const pages=[['index.html','home','新建事项','Work.home()'],['tasks/index.html','tasks','我的待办','Work.tasks()'],['business/index.html','business','小区事务','Work.directory()'],['library/index.html','docs','资料库','Work.library()'],['community/index.html','archive','小区档案','A0.archiveHTML()'],['chat/index.html','chat','事项对话','chatPage()'],['onboarding/index.html','home','入驻与建档','Work.home()'],...modules.map(m=>[`business/${m.id}/index.html`,'work',m.name,'Work.moduleHTML()',m.id])];
const css=['style','a0','refinement','work'];
const scripts=['routes','a0-model','a0-ui','work-catalog','work-model','work-ui'];
for(const [file,page,title,render,module] of pages){const prefix='../'.repeat(file.split('/').length-1);const dir=path.dirname(path.join(root,file));fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'page.js'),`// ${title}页面入口；公共布局由 app.js 提供。\nfunction PageContent(){return ${render};}\n`);fs.writeFileSync(path.join(root,file),`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f7f7f7">
  <title>${title} · 智邻</title>
${css.map(f=>`  <link rel="stylesheet" href="${prefix}assets/css/${f}.css">`).join('\n')}
</head>
<body data-page="${page}"${module?` data-module="${module}"`:''}>
  <div id="app"></div>
  <div id="overlay"></div>
  <div id="toast" role="status"></div>
  <noscript>请启用 JavaScript 后使用工作台。</noscript>
${scripts.map(f=>`  <script src="${prefix}assets/js/${f}.js"></script>`).join('\n')}
  <script src="./page.js"></script>
  <script src="${prefix}assets/js/app.js"></script>
</body>
</html>
`);}
console.log(`Generated ${pages.length} page entries.`);
