'use strict';
'require view';
'require ui';
'require tower';

const css = '\
.tower-card{border:1px solid rgba(128,128,128,.16);border-radius:12px;padding:16px 18px;margin-bottom:14px;background:rgba(255,255,255,.025)}\
.tower-card-title{font-size:11px;font-weight:600;opacity:.55;margin:0 0 12px;padding:0;letter-spacing:.3px;text-transform:uppercase}\
.tower-client-grid{display:flex;flex-wrap:wrap;gap:8px}\
.tower-client-card{display:inline-flex;align-items:center;padding:8px 13px;border:1px solid rgba(128,128,128,.32);border-radius:8px;cursor:pointer;background:transparent;font-size:13px;user-select:none}\
.tower-client-card input{display:none}\
.tower-client-card:has(input:checked){border-color:#4aa065;background:rgba(74,160,101,.14);font-weight:600}\
.tower-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px}\
.tower-filter{margin-left:auto;min-width:200px;box-sizing:border-box;border:1px solid rgba(128,128,128,.28);border-radius:6px;background:transparent;color:inherit;font-size:12px;padding:7px 9px}\
.tower-summary{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:8px;font-size:12px;opacity:.8}\
.tower-results{border:1px solid rgba(128,128,128,.18);border-radius:8px;max-height:340px;overflow:auto}\
.tower-result{display:grid;grid-template-columns:20px minmax(100px,1fr) 88px;gap:8px;align-items:center;padding:7px 10px;border-bottom:1px solid rgba(128,128,128,.12);font-size:12.5px}\
.tower-result:last-child{border-bottom:0}\
.tower-result input{appearance:checkbox !important;-webkit-appearance:checkbox !important;accent-color:#4aa065;width:15px;height:15px;margin:0}\
.tower-name,.tower-server{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
.tower-proto{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;opacity:.65;text-transform:uppercase;justify-self:end}\
.tower-empty{display:flex;align-items:center;justify-content:center;min-height:64px;padding:16px;text-align:center;font-size:12px;opacity:.5}\
.tower-preview{width:100%;height:300px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.5;box-sizing:border-box;border:1px solid rgba(128,128,128,.18);border-radius:8px;background:transparent;color:inherit;padding:10px}\
.tower-share{display:none}\
.tower-share.tower-visible{display:block}\
.tower-share-head{display:flex;align-items:center;gap:8px;margin-bottom:8px}\
.tower-share-head .tower-card-title{margin:0}\
.tower-link-list{border:1px solid rgba(128,128,128,.18);border-radius:8px;max-height:300px;overflow:auto}\
.tower-link-row{display:grid;grid-template-columns:74px minmax(80px,1fr) auto;gap:8px;align-items:center;padding:6px 10px;border-bottom:1px solid rgba(128,128,128,.12);font-size:12px}\
.tower-link-row:last-child{border-bottom:0}\
.tower-link-row .tower-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\
.tower-btn-row{display:flex;gap:6px;align-items:center}\
.tower-btn{font-size:11.5px;padding:4px 10px}\
.tower-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px}\
.tower-modal{background:var(--cbi-background,#fff);color:var(--cbi-color,#000);border-radius:14px;padding:20px;max-width:340px;width:100%;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.3)}\
.tower-modal-title{font-size:14px;font-weight:600;margin:0 0 12px}\
.tower-modal canvas{image-rendering:pixelated;width:220px;height:220px;background:#fff;padding:8px;border-radius:8px}\
.tower-modal-link{font-size:11px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all;opacity:.65;margin:12px 0;text-align:left;max-height:64px;overflow:auto}\
.tower-modal-actions{display:flex;gap:8px;justify-content:center}\
';

function extFor(target) {
	if (target === 'sing-box' || target === 'hiddify')
		return '.json';
	if (target === 'surge' || target === 'surge-mac' || target === 'shadowrocket')
		return '.conf';
	return '.yaml';
}

function loadQrcode() {
	if (window.qrcode)
		return Promise.resolve(window.qrcode);

	return new Promise(function(resolve, reject) {
		var s = document.createElement('script');
		s.src = L.resource('view/tower/vendor/qrcode.js');
		s.onload = function() { resolve(window.qrcode); };
		s.onerror = function() { reject(new Error(_('二维码组件加载失败'))); };
		document.head.appendChild(s);
	});
}

function renderQR(canvas, text) {
	return loadQrcode().then(function(QR) {
		var qr = QR(0, 'M');
		qr.addData(text);
		qr.make();
		var size = qr.getModuleCount();
		var scale = 5;
		canvas.width = size * scale;
		canvas.height = size * scale;
		var ctx = canvas.getContext('2d');
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = '#000000';
		for (var r = 0; r < size; r++)
			for (var c = 0; c < size; c++)
				if (qr.isDark(r, c))
					ctx.fillRect(c * scale, r * scale, scale, scale);
	});
}

function showQRModal(name, link) {
	var canvas = E('canvas');

	var overlay = E('div', { 'class': 'tower-modal-overlay' }, [
		E('div', {
			'class': 'tower-modal',
			'click': function(ev) { ev.stopPropagation(); }
		}, [
			E('p', { 'class': 'tower-modal-title' }, [ name ]),
			canvas,
			E('div', { 'class': 'tower-modal-link' }, [ link ]),
			E('div', { 'class': 'tower-modal-actions' }, [
				E('button', {
					'class': 'btn cbi-button',
					'click': ui.createHandlerFn(this, function() {
						return tower.copyText(link).then(function() {
							ui.addNotification(null, E('p', [ _('已复制链接') ]), 'info');
						}).catch(function() {
							ui.addNotification(null, E('p', [ _('复制失败') ]), 'error');
						});
					})
				}, [ _('复制链接') ]),
				E('button', {
					'class': 'btn cbi-button cbi-button-reset',
					'click': ui.createHandlerFn(this, function() { document.body.removeChild(overlay); })
				}, [ _('关闭') ])
			])
		])
	]);

	overlay.addEventListener('click', function() { document.body.removeChild(overlay); });
	document.body.appendChild(overlay);
	renderQR(canvas, link).catch(function() {
		canvas.parentNode.insertBefore(E('p', { 'class': 'tower-empty' }, [ _('二维码生成失败') ]), canvas);
	});
}

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

		var previewArea = E('textarea', {
			'class': 'tower-preview',
			'readonly': 'readonly',
			'placeholder': _('点击「生成」后在此预览配置内容。')
		});

		var linkList = E('div', { 'class': 'tower-link-list' });
		var sharePanel = E('div', { 'class': 'tower-share' }, [
			E('div', { 'class': 'tower-card' }, [
				E('h4', { 'class': 'tower-card-title' }, _('配置文件')),
				E('div', { 'class': 'tower-toolbar' }, [
					E('button', { 'class': 'btn cbi-button', 'id': 'tower-download-file' }, [ _('下载文件') ]),
					E('button', { 'class': 'btn cbi-button', 'id': 'tower-copy-config' }, [ _('复制配置文本') ])
				]),
				previewArea
			]),
			E('div', { 'class': 'tower-card' }, [
				E('h4', { 'class': 'tower-card-title' }, _('节点链接')),
				E('div', { 'class': 'tower-toolbar' }, [
					E('button', { 'class': 'btn cbi-button', 'id': 'tower-download-links' }, [ _('下载链接文件') ]),
					E('button', { 'class': 'btn cbi-button', 'id': 'tower-copy-links' }, [ _('复制全部链接') ]),
					E('span', { 'class': 'tower-summary' }, [ _('点「二维码」用手机扫码导入单个节点。') ])
				]),
				linkList
			])
		]);

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

		function selectedIDs() {
			var ids = [];
			for (var id in selected)
				if (selected[id]) ids.push(id);
			return ids;
		}

		var currentContent = '';
		var currentLinks = [];
		var currentTargetName = 'clash-verge';

		function renderLinks(links) {
			currentLinks = links || [];
			while (linkList.firstChild)
				linkList.removeChild(linkList.firstChild);

			if (!currentLinks.length) {
				linkList.appendChild(E('div', { 'class': 'tower-empty' }, _('没有可导出的节点链接。')));
				return;
			}

			currentLinks.forEach(function(item) {
				linkList.appendChild(E('div', { 'class': 'tower-link-row' }, [
					E('span', { 'class': 'tower-proto' }, String(item.kind)),
					E('span', { 'class': 'tower-name', 'title': item.link }, item.name),
					E('div', { 'class': 'tower-btn-row' }, [
						E('button', {
							'class': 'btn cbi-button tower-btn',
							'click': ui.createHandlerFn(this, function() {
								return tower.copyText(item.link).then(function() {
									ui.addNotification(null, E('p', [ _('已复制链接') ]), 'info');
								});
							})
						}, [ _('复制') ]),
						E('button', {
							'class': 'btn cbi-button tower-btn',
							'click': ui.createHandlerFn(this, function() { showQRModal(item.name, item.link); })
						}, [ _('二维码') ])
					])
				]));
			});
		}

		// —— 生成 ——
		var generateBtn = E('button', {
			'class': 'btn cbi-button cbi-button-apply',
			'click': ui.createHandlerFn(this, function() {
				var ids = selectedIDs();
				if (!ids.length) {
					ui.addNotification(null, E('p', [ _('请至少选择一个节点。') ]), 'error');
					return Promise.resolve();
				}
				currentTargetName = currentTarget();
				var idsStr = ids.join(',');
				return Promise.all([
					tower.rpcExport(currentTargetName, '', idsStr),
					tower.rpcLinks('', idsStr)
				]).then(function(res) {
					currentContent = res[0] || '';
					previewArea.value = currentContent;
					renderLinks(res[1]);
					sharePanel.classList.add('tower-visible');
					ui.addNotification(null, E('p', [ _('已生成配置与节点链接。') ]), 'info');
				}).catch(function(e) {
					ui.addNotification(null, E('p', [ String(e) ]), 'error');
				});
			})
		}, [ _('生成配置与链接') ]);

		// —— 分享面板按钮 ——
		sharePanel.querySelector('#tower-download-file').addEventListener('click', function() {
			if (!currentContent) {
				ui.addNotification(null, E('p', [ _('请先生成配置。') ]), 'error');
				return;
			}
			tower.downloadFile('tower-' + currentTargetName + extFor(currentTargetName), currentContent);
			ui.addNotification(null, E('p', [ _('配置文件已下载') ]), 'info');
		});

		sharePanel.querySelector('#tower-copy-config').addEventListener('click', function() {
			if (!currentContent) {
				ui.addNotification(null, E('p', [ _('请先生成配置。') ]), 'error');
				return;
			}
			tower.copyText(currentContent).then(function() {
				ui.addNotification(null, E('p', [ _('配置已复制到剪贴板') ]), 'info');
			}).catch(function() {
				ui.addNotification(null, E('p', [ _('复制失败') ]), 'error');
			});
		});

		sharePanel.querySelector('#tower-download-links').addEventListener('click', function() {
			if (!currentLinks.length) {
				ui.addNotification(null, E('p', [ _('没有可导出的节点链接。') ]), 'error');
				return;
			}
			tower.downloadFile('tower-links.txt', currentLinks.map(function(i) { return i.link; }).join('\n') + '\n');
			ui.addNotification(null, E('p', [ _('链接文件已下载') ]), 'info');
		});

		sharePanel.querySelector('#tower-copy-links').addEventListener('click', function() {
			if (!currentLinks.length) {
				ui.addNotification(null, E('p', [ _('没有可导出的节点链接。') ]), 'error');
				return;
			}
			tower.copyText(currentLinks.map(function(i) { return i.link; }).join('\n')).then(function() {
				ui.addNotification(null, E('p', [ _('全部链接已复制') ]), 'info');
			}).catch(function() {
				ui.addNotification(null, E('p', [ _('复制失败') ]), 'error');
			});
		});

		// —— 节点选择工具栏 ——
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

		// —— 目标客户端 grid ——
		var clientGrid = tower.clients.map(function(c) {
			return E('label', { 'class': 'tower-client-card' }, [
				E('input', { 'type': 'radio', 'name': 'tower-client', 'value': c.id }),
				E('span', {}, [ c.name ])
			]);
		});
		clientGrid[0].querySelector('input').checked = true;

		renderResults();

		if (nodes.length === 0) {
			return E('div', { 'class': 'cbi-map' }, [
				E('style', {}, [ css ]),
				E('div', { 'class': 'tower-empty' }, [ _('还没有节点。请先到「订阅」页添加订阅或导入节点。') ])
			]);
		}

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
				E('h4', { 'class': 'tower-card-title' }, _('3. 生成与导出')),
				E('div', { 'class': 'tower-toolbar' }, [ generateBtn ]),
				sharePanel
			])
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
