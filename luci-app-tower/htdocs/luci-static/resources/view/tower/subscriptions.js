'use strict';
'require view';
'require ui';
'require tower';

const css = '\
.tower-card{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border:1px solid rgba(0,0,0,.06);border-radius:10px;background:rgba(255,255,255,.03);margin-bottom:10px}\
.tower-card-info{min-width:0;flex:1}\
.tower-card-name{font-size:15px;font-weight:600;color:inherit;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\
.tower-card-url{font-size:12px;opacity:.6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px}\
.tower-card-meta{display:flex;gap:8px;margin-top:6px;flex-wrap:wrap}\
.tower-pill{display:inline-block;padding:2px 8px;border-radius:10px;background:rgba(128,128,128,.14);font-size:12px}\
.tower-pill-err{background:rgba(217,109,109,.14);color:#d96d6d}\
.tower-card-actions{display:flex;gap:6px;flex-shrink:0}\
.tower-add{display:flex;gap:8px;align-items:flex-end;margin-bottom:14px;flex-wrap:wrap}\
.tower-field{display:flex;flex-direction:column;gap:4px;flex:1;min-width:180px}\
.tower-field label{font-size:12px;opacity:.7}\
.tower-field input,.tower-field select,.tower-paste{box-sizing:border-box;border:1px solid rgba(128,128,128,.28);border-radius:6px;background:transparent;color:inherit;font-size:12px;padding:7px 9px}\
.tower-paste{width:100%;min-height:140px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;resize:vertical}\
';

return view.extend({
	load: function() {
		return Promise.all([
			L.resolveDefault(tower.rpcListSubs(), []),
			L.resolveDefault(tower.rpcListNodes(), [])
		]).then(function(res) {
			var subs = res[0], nodes = res[1];
			var counts = {};
			var local = 0;
			nodes.forEach(function(n) {
				if (n.source_id)
					counts[n.source_id] = (counts[n.source_id] || 0) + 1;
				else
					local++;
			});
			subs.forEach(function(s) { s.node_count = counts[s.id] || 0; });
			subs.local_nodes = local;
			return subs;
		});
	},

	render: function(subs) {
		var localCount = subs.local_nodes || 0;

		var nameInput = E('input', { 'class': 'cbi-input-text', 'name': 'name', 'placeholder': _('留空自动命名') });
		var urlInput = E('input', { 'class': 'cbi-input-text', 'name': 'url', 'placeholder': 'https://…' });

		var uaSelect = E('select', { 'class': 'cbi-input-select', 'name': 'user_agent' });
		tower.userAgents.forEach(function(u) {
			uaSelect.appendChild(E('option', { 'value': u.id }, [ u.name ]));
		});

		var addBtn = E('button', {
			'class': 'btn cbi-button cbi-button-apply',
			'click': ui.createHandlerFn(this, function() {
				var url = urlInput.value.trim();
				if (!url) {
					ui.addNotification(null, E('p', [ _('订阅链接必填') ]), 'error');
					return;
				}
				return L.resolveDefault(tower.rpcAddSub(nameInput.value.trim(), url, uaSelect.value), null).then(function(sub) {
					if (!sub || !sub.id)
						return;
					return tower.rpcRefresh(sub.id).then(function(res) {
						var err = (res && res[0]) ? res[0].error : null;
						if (err)
							ui.addNotification(null, E('p', [ err ]), 'error');
						else
							ui.addNotification(null, E('p', [ _('订阅已添加') ]), 'info');
						window.location.reload();
					});
				}).catch(function(e) {
					ui.addNotification(null, E('p', [ String(e) ]), 'error');
				});
			})
		}, [ _('添加并更新') ]);

		var pasteTextarea = E('textarea', {
			'class': 'tower-paste',
			'placeholder': _('粘贴 Clash YAML / Surge INI / Base64 或分享链接，自动识别并导入节点。')
		});

		var importBtn = E('button', {
			'class': 'btn cbi-button cbi-button-apply',
			'click': ui.createHandlerFn(this, function() {
				var content = pasteTextarea.value.trim();
				if (!content) {
					ui.addNotification(null, E('p', [ _('请先粘贴配置内容。') ]), 'error');
					return;
				}
				return tower.rpcImport(content).then(function(res) {
					if (res.error)
						ui.addNotification(null, E('p', [ res.error ]), 'error');
					else
						ui.addNotification(null, E('p', [ _('已导入 %d 个节点').format(res.imported || 0) ]), 'info');
					window.location.reload();
				}).catch(function(e) {
					ui.addNotification(null, E('p', [ String(e) ]), 'error');
				});
			})
		}, [ _('导入节点') ]);

		var cards = subs.map(function(sub) {
			var meta = [ E('span', { 'class': 'tower-pill' }, [ sub.node_count + ' ' + _('个节点') ]) ];
			if (sub.last_error)
				meta.push(E('span', { 'class': 'tower-pill tower-pill-err' }, [ _('更新失败') ]));

			return E('div', { 'class': 'tower-card' }, [
				E('div', { 'class': 'tower-card-info' }, [
					E('div', { 'class': 'tower-card-name' }, [ sub.name ]),
					E('div', { 'class': 'tower-card-url' }, [ sub.url ]),
					E('div', { 'class': 'tower-card-meta' }, meta)
				]),
				E('div', { 'class': 'tower-card-actions' }, [
					E('button', {
						'class': 'btn cbi-button cbi-button-apply',
						'click': ui.createHandlerFn(this, function() {
							return tower.rpcRefresh(sub.id).then(function(res) {
								var err = (res && res[0]) ? res[0].error : null;
								if (err)
									ui.addNotification(null, E('p', [ err ]), 'error');
								else
									ui.addNotification(null, E('p', [ _('已更新') ]), 'info');
								window.location.reload();
							}).catch(function(e) {
								ui.addNotification(null, E('p', [ String(e) ]), 'error');
							});
						})
					}, [ _('更新') ]),
					E('button', {
						'class': 'btn cbi-button cbi-button-reset',
						'click': ui.createHandlerFn(this, function() {
							if (!confirm(_('删除此订阅及其节点？')))
								return;
							return tower.rpcRemoveSub(sub.id).then(function() {
								window.location.reload();
							}).catch(function(e) {
								ui.addNotification(null, E('p', [ String(e) ]), 'error');
							});
						})
					}, [ _('删除') ])
				])
			]);
		});

		return E('div', { 'class': 'cbi-map' }, [
			E('style', {}, [ css ]),
			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, [ _('添加订阅') ]),
				E('div', { 'class': 'tower-add' }, [
					E('div', { 'class': 'tower-field' }, [
						E('label', {}, [ _('名称') ]),
						nameInput
					]),
					E('div', { 'class': 'tower-field' }, [
						E('label', {}, [ _('订阅链接') ]),
						urlInput
					]),
					E('div', { 'class': 'tower-field' }, [
						E('label', {}, [ _('User-Agent') ]),
						uaSelect
					]),
					addBtn
				])
			]),
			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, [ _('粘贴导入') ]),
				E('p', { 'class': 'cbi-section-descr' }, [ _('粘贴 Clash YAML、Surge INI、Base64 或分享链接，自动识别并提取节点。') ]),
				pasteTextarea,
				E('div', { 'class': 'cbi-value' }, [
					E('div', { 'class': 'cbi-value-field' }, [ importBtn ])
				])
			]),
			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, [ _('我的订阅'), E('span', { 'class': 'tower-pill' }, [ subs.length + ' ' + _('个') ]) ])
			].concat(
				(localCount > 0) ? [ E('p', { 'class': 'cbi-section-descr' }, [ _('已导入 %d 个自有节点').format(localCount) ]) ] : [],
				(subs.length === 0)
					? [ E('p', { 'class': 'cbi-section-descr' }, [ _('还没有订阅，先在上方添加或粘贴一个。') ]) ]
					: cards
			))
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
