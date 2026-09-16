'use strict';
'require view';
'require ui';
'require tower';

const css = '\
.tower-card{border:1px solid rgba(0,0,0,.06);border-radius:10px;padding:16px 18px;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,0,0,.03);background:rgba(255,255,255,.03)}\
.tower-card-title{font-size:11px;font-weight:600;opacity:.55;margin:0 0 10px;padding:0;letter-spacing:.3px;text-transform:uppercase}\
.tower-client-grid{display:flex;flex-wrap:wrap;gap:8px}\
.tower-client-card{display:inline-block;padding:9px 14px;border:1px solid rgba(128,128,128,.3);border-radius:7px;cursor:pointer;background:transparent;font-size:13px}\
.tower-client-card input{display:none}\
.tower-client-card:has(input:checked){border-color:#4aa065;background:rgba(74,160,101,.12)}\
.tower-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}\
.tower-filter{margin-left:auto;min-width:220px;box-sizing:border-box;border:1px solid rgba(128,128,128,.28);border-radius:6px;background:transparent;color:inherit;font-size:12px;padding:7px 9px}\
.tower-summary{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:8px;font-size:12px;opacity:.8}\
.tower-results{border:1px solid rgba(128,128,128,.18);border-radius:7px;max-height:420px;overflow:auto}\
.tower-result{display:grid;grid-template-columns:22px minmax(100px,1fr) 90px;gap:8px;align-items:center;padding:7px 9px;border-bottom:1px solid rgba(128,128,128,.13);font-size:12px}\
.tower-result:last-child{border-bottom:0}\
.tower-result input{appearance:checkbox !important;-webkit-appearance:checkbox !important;accent-color:#4aa065;width:15px;height:15px}\
.tower-name,.tower-server{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
.tower-proto{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;opacity:.7;text-transform:uppercase}\
.tower-empty{display:flex;align-items:center;justify-content:center;min-height:72px;padding:16px;text-align:center;font-size:11.5px;opacity:.48}\
.tower-preview{width:100%;height:420px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.5;box-sizing:border-box}\
';

return view.extend({
	load: function() {
		return tower.rpcListNodes();
	},

	render: function(nodes) {
		var selected = {};
		nodes.forEach(function(n) { selected[n.id] = true; });

		var filterText = '';

		var resultBody = E('div', { 'class': 'tower-results' });
		var statTotal = E('strong', {}, '0');
		var statSelected = E('strong', {}, '0');
		var statTarget = E('span', { 'class': 'tower-stat' }, _('未生成'));

		function currentTarget() {
			var el = document.querySelector('input[name=tower-client]:checked');
			return el ? el.value : 'clash-verge';
		}

		function selectedCount() {
			var n = 0;
			for (var id in selected)
				if (selected[id]) n++;
			return n;
		}

		function updateSummary() {
			statTotal.textContent = String(nodes.length);
			statSelected.textContent = String(selectedCount());
		}

		function visibleNodes() {
			var q = filterText.toLowerCase();
			return nodes.filter(function(n) {
				return !q || n.name.toLowerCase().indexOf(q) >= 0 || String(n.kind).toLowerCase().indexOf(q) >= 0;
			});
		}

		function renderResults() {
			while (resultBody.firstChild)
				resultBody.removeChild(resultBody.firstChild);

			var shown = visibleNodes();
			shown.forEach(function(n) {
				var checkbox = E('input', { 'type': 'checkbox' });
				checkbox.checked = !!selected[n.id];
				checkbox.addEventListener('change', function() {
					selected[n.id] = checkbox.checked;
					updateSummary();
				});
				resultBody.appendChild(E('div', { 'class': 'tower-result' }, [
					checkbox,
					E('span', { 'class': 'tower-name', 'title': n.name }, n.name),
					E('span', { 'class': 'tower-proto' }, String(n.kind))
				]));
			});
			if (!shown.length)
				resultBody.appendChild(E('div', { 'class': 'tower-empty' }, _('没有匹配的节点。')));
			updateSummary();
		}

		var clientGrid = tower.clients.map(function(c) {
			return E('label', { 'class': 'tower-client-card' }, [
				E('input', { 'type': 'radio', 'name': 'tower-client', 'value': c.id }),
				E('span', {}, [ c.name ])
			]);
		});
		clientGrid[0].querySelector('input').checked = true;

		var filterInput = E('input', {
			'class': 'tower-filter',
			'placeholder': _('筛选节点名称或协议')
		});
		filterInput.addEventListener('input', function() {
			filterText = filterInput.value;
			renderResults();
		});

		var selectAllBtn = E('button', {
			'class': 'btn cbi-button',
			'click': ui.createHandlerFn(this, function() {
				visibleNodes().forEach(function(n) { selected[n.id] = true; });
				renderResults();
			})
		}, [ _('全选') ]);

		var clearBtn = E('button', {
			'class': 'btn cbi-button',
			'click': ui.createHandlerFn(this, function() {
				visibleNodes().forEach(function(n) { selected[n.id] = false; });
				renderResults();
			})
		}, [ _('清空') ]);

		var textarea = E('textarea', {
			'class': 'tower-preview',
			'readonly': 'readonly',
			'placeholder': _('点击生成配置预览结果。')
		});

		var generateBtn = E('button', {
			'class': 'btn cbi-button cbi-button-apply',
			'click': ui.createHandlerFn(this, function() {
				var ids = [];
				for (var id in selected)
					if (selected[id]) ids.push(id);
				if (!ids.length) {
					ui.addNotification(null, E('p', [ _('请至少选择一个节点。') ]), 'error');
					return;
				}
				var target = currentTarget();
				statTarget.textContent = target;
				return tower.rpcExport(target, '', ids.join(',')).then(function(content) {
					textarea.value = content;
				}).catch(function(e) {
					ui.addNotification(null, E('p', [ String(e) ]), 'error');
				});
			})
		}, [ _('生成配置') ]);

		var copyBtn = E('button', {
			'class': 'btn cbi-button',
			'click': ui.createHandlerFn(this, function() {
				textarea.select();
				document.execCommand('copy');
				ui.addNotification(null, E('p', [ _('已复制到剪贴板') ]), 'info');
			})
		}, [ _('复制配置文本') ]);

		renderResults();

		return E('div', { 'class': 'cbi-map' }, [
			E('style', {}, [ css ]),
			E('div', { 'class': 'tower-card' }, [
				E('h4', { 'class': 'tower-card-title' }, _('1. 目标客户端')),
				E('div', { 'class': 'tower-client-grid' }, clientGrid)
			]),
			E('div', { 'class': 'tower-card' }, [
				E('h4', { 'class': 'tower-card-title' }, _('2. 选择节点')),
				E('div', { 'class': 'tower-toolbar' }, [ selectAllBtn, ' ', clearBtn, ' ', filterInput ]),
				E('div', { 'class': 'tower-summary' }, [
					E('span', {}, [ _('共'), ' ', statTotal, ' ', _('个节点') ]),
					E('span', {}, [ _('已选'), ' ', statSelected, ' ', _('个') ])
				]),
				resultBody
			]),
			E('div', { 'class': 'tower-card' }, [
				E('h4', { 'class': 'tower-card-title' }, _('3. 配置预览')),
				E('div', { 'class': 'tower-toolbar' }, [ generateBtn, ' ', copyBtn, ' ', statTarget ]),
				textarea
			])
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
