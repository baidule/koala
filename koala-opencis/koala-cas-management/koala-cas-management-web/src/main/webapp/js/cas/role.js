var roleManager = function(){
	var baseUrl = 'auth/Role/';
	var dialog = null;    //对话框
	var roleName = null;   //角色名称
	var roleDescript = null;    //角色描述
	var dataGrid = null; //Grid对象
	/*
	 *新增
	 */
	var add = function(grid){
		dataGrid = grid;
		$.get('pages/cas/role-template.html').done(function(data){
			init(data);
		});
	};
	/*
	 * 修改
	 */
	var modify = function(item, grid){
		dataGrid = grid;
		$.get('pages/cas/role-template.html').done(function(data){
			init(data,item);
			setData(item);
		});
	};
	/*
	 删除方法
	 */
	var deleteUser = function(roles, grid){
		var data = {};
		for(var i=0,j=roles.length; i<j; i++){
			var role = roles[i];
			data['roles['+i+'].id'] = role.id;
		}
		dataGrid = grid;
		$.post(baseUrl + 'del.koala', data).done(function(data){
			if(data.result == 'success'){
				$('body').message({
					type: 'success',
					content: '删除成功'
				});
				dataGrid.grid('refresh');
			}else{
				$('body').message({
					type: 'error',
					content: data.result
				});
			}
		}).fail(function(data){
				$('body').message({
					type: 'error',
					content: '删除失败'
				});
			});
	};
	/**
	 * 初始化
	 */
	var init = function(data, item){
		dialog = $(data);
		dialog.find('.modal-header').find('.modal-title').html(item ? '修改角色':'添加角色');
		roleName = dialog.find('#roleName');
		roleDescript = dialog.find('#roleDescript');
		dialog.find('#save').on('click',function(){
			save(item);
		}).end().modal({
			keyboard: false
		}).on({
				'hidden.bs.modal': function(){
					$(this).remove();
				},
				'complete': function(){
					$('body').message({
						type: 'success',
						content: '保存成功'
					});
					$(this).modal('hide');
					dataGrid.grid('refresh');
				}
		});
	};

	/*
	 *设置值
	 */
	var setData = function(item){
		roleName.val(item.name);
		roleDescript.val(item.roleDesc);
	}
		
	/*
	*   保存数据 id存在则为修改 否则为新增
	 */
	var save = function(item){
		if(!validate(item)){
			return false;
		}
		var url = baseUrl + 'add.koala';
		if(item){
			url =  baseUrl + 'update.koala';
		}
		$.post(url,getAllData(item)).done(function(data){
			if(data.result == 'success'){
				dialog.trigger('complete');
			}else{
				dialog.message({
					type: 'error',
					content: data.result
				});
			}
		});
	};
	/**
	 * 数据验证
	 */
	var validate = function(item){
		if(!Validation.notNull(dialog, roleName, roleName.val(), '请输入角色名称')){
			return false;
		}
		return true;
	}
	/*
	*获取表单数据
	 */
	var getAllData = function(item){
		var data = {};
		data['roleVO.name'] = roleName.val();
		data['roleVO.roleDesc'] = roleDescript.val();
		if(item){
			data['roleVO.id'] = item.id;	
		}
		return data;
	};
	/**
	 * 分配角色
	 */
	var assignRole = function(userId, userAccount, grid){
		dataGrid = grid;
		$.get('pages/cas/select-role.html').done(function(data){
			var dialog = $(data);
			dialog.find('#save').on('click',function(){
				var indexs = dialog.find('#selectRoleGrid').data('koala.grid').selectedRowsIndex();
				if(indexs.length == 0){
					$('body').message({
						type: 'warning',
						content: '请选择要分配的角色'
					});
					return;
				}
				var data = {};
				data['userVO.id'] = userId;
				for(var i=0,j=indexs.length; i<j; i++){
					data['roles['+i+'].id'] = indexs[i];
				}
				$.post('/auth/User/assignRoles.koala', data).done(function(data){
					if(data.result == 'success'){
						$('body').message({
							type: 'success',
							content: '保存成功'
						});
						dialog.modal('hide');
						dataGrid.grid('refresh');
					}else{
						$('body').message({
							type: 'error',
							content: data.result
						});
					}
				}).fail(function(data){
					$('body').message({
						type: 'error',
						content: '保存失败'
					});
				});
			}).end().modal({
				keyboard: false
			}).on({
					'hidden.bs.modal': function(){
						$(this).remove();
					},
					'shown.bs.modal': function(){
						initSelectRoleGrid(userId, userAccount, dialog);
					},
					'complete': function(){
						$('body').message({
							type: 'success',
							content: '保存成功'
						});
						$(this).modal('hide');
						dataGrid.grid('refresh');
					}
			});
		});
	};
	/**
	 * 初始化角色选择grid
	 */
	var initSelectRoleGrid = function(userId, userAccount, dialog){
		var columns = [ 
					{
						title : "角色名称",
						name : "name",
						width : 150
					}, 
					{
						title : "角色描述",
						name : "roleDesc",
						width : 150
					}
				];
		dialog.find('#selectRoleGrid').grid({
			 identity: 'id',
             columns: columns,
             querys: [{title: '角色名称', value: 'roleNameForSearch'}],
             url: baseUrl+'queryRolesForAssign.koala?userId='+userId+'&userAccount='+userAccount
        });
	};
	/**
	 * 解除角色关联
	 */
	var removeRoleForUser = function(userId, roles, grid){
		var data = {};
		for(var i=0,j=roles.length; i<j; i++){
			data['roles['+i+'].id'] = roles[i].id;
		}
		data.userId = userId;
		dataGrid = grid;
		$.post(baseUrl + 'removeRoleForUser.koala', data).done(function(data){
			if(data.result == 'success'){
				$('body').message({
					type: 'success',
					content: '删除成功'
				});
				dataGrid.grid('refresh');
			}else{
				$('body').message({
					type: 'error',
					content: data.result
				});
			}
		}).fail(function(data){
				$('body').message({
					type: 'error',
					content: '删除失败'
				});
			});
	};
	var assignUser = function(roleId, name){
		$(this).openTab('/pages/cas/user-list.html', 
			name+'的用户管理', 'userManager_'+roleId, roleId, {roleId: roleId});
	};
	/**
	 * 资源授权
	 */
	var assignResource = function(roleId){
		$.get('pages/cas/assign-resource.html').done(function(data){
			var dialog = $(data);
			dialog.find('#save').on('click',function(){
				var treeObj = $.fn.zTree.getZTreeObj("resourceTree");
				var nodes = treeObj.getCheckedNodes(true);
				var data = {};
				data['roleVO.id'] = roleId;
				for(var i=0,j=nodes.length; i<j; i++){
					data['menus['+i+'].id'] = nodes[i].id;
				}
				$.post(baseUrl + 'assignMenuResources.koala', data).done(function(data){
					if(data.result == 'success'){
						$('body').message({
							type: 'success',
							content: '保存成功'
						});
						dialog.modal('hide');
					}else{
						$('body').message({
							type: 'error',
							content: data.result
						});
					}
				}).fail(function(data){
						$('body').message({
							type: 'error',
							content: '保存失败'
						});
					});
			}).end().modal({
				keyboard: false
			}).on({
					'hidden.bs.modal': function(){
						$(this).remove();
					},
					'shown.bs.modal': function(){
						initResourceTree(roleId);
					},
					'complete': function(){
						$('body').message({
							type: 'success',
							content: '保存成功'
						});
						$(this).modal('hide');
						dataGrid.grid('refresh');
					}
			});
		});
	};
	/*
	* 加载资源树
	 */
	var initResourceTree = function(roleId){
		$.get('auth/Menu/findMenuTreeSelectItemByRole.koala?time='+new Date().getTime()+'&roleId='+roleId).done(function(result){
			var setting = {
				check: {
					enable: true
				}
			};
			var zNodes = new Array();
			var items = result.data;
			for(var i=0, j=items.length; i<j; i++){
				var item = items[i];
				var zNode = {};
				zNode.id = item.id;
				zNode.name = item.name;
				zNode.open = true;
				zNode.checked = item.ischecked;
				if(item.children &&item.children.length > 0){
					zNode.children = getChildrenData(new Array(), item.children);
				}
				zNodes.push(zNode);
			}
			$.fn.zTree.init($("#resourceTree"), setting, zNodes);
		});
	};
	/**
	 * 
	 */
	var getChildrenData = function(nodes, items){
		for(var i=0,j=items.length; i<j; i++){
			var item = items[i];
			var zNode = {};
			zNode.id = item.id;
			zNode.name = item.name;
			zNode.checked = item.ischecked;
			if(item.children && item.children.length > 0){
				zNode.children = getChildrenData(new Array(), item.children);
			}
			nodes.push(zNode);
		}
		return nodes;
	};
	return {
		add: add,
		modify: modify,
		deleteUser: deleteUser,
		assignRole: assignRole,
		removeRoleForUser: removeRoleForUser,
		assignUser: assignUser,
		assignResource: assignResource
	};
};