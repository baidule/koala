package org.jwebap.core;

import java.util.Collection;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import org.jwebap.cfg.persist.PersistManager;
import org.jwebap.plugin.task.MonitorTask;
import org.jwebap.plugin.task.ServiceConnectionCheckTask;
import org.jwebap.plugin.tracer.SwapDataCache;
import org.jwebap.plugin.tracer.http.HttpComponent;
import org.jwebap.plugin.tracer.jdbc.JdbcComponent;
import org.jwebap.plugin.tracer.method.MethodComponent;
import org.jwebap.startup.JwebapInitialException;
import org.openkoala.koala.monitor.jwebap.ComponentDef;
import org.openkoala.koala.monitor.jwebap.DataPolicyDef;
import org.openkoala.koala.monitor.jwebap.NodeDef;
import org.openkoala.koala.monitor.jwebap.TaskDef;
import org.openkoala.koala.monitor.service.remote.RemoteDataPolicyClientHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 监控组件上下文根,代表一个jwebap实例
 * 
 * @author leadyu
 * @since Jwebap 0.5
 * @date Aug 7, 2007
 */
public class RuntimeContext implements Context {

	private static final Logger LOG = LoggerFactory.getLogger(RuntimeContext.class);
	
	private static RuntimeContext context;
	
	private TraceLiftcycleManager _container = null;

	private NodeDef _config=null;
	
	private Map<String,Component> _components = null;
	
	private Map<String,MonitorTask> _monitorTasks = null;
	

	private PersistManager _jwebapDefManager=null;
	
	//监控数据缓存
	private SwapDataCache dataCache;

	private Map<String, String> serverInfos;
	
	private RuntimeContext(NodeDef config,TraceLiftcycleManager container,PersistManager defManager) {
		_components = new HashMap<String,Component>();
		_monitorTasks = new HashMap<String, MonitorTask>();
		_container = container;
		_config=config;
		_jwebapDefManager=defManager;
		dataCache = new SwapDataCache(_config.getMaxCacheSize(), _config.getCacheExpireTime());
		LOG.info("当前监控配置为：\n"+config.toString());
	}
	
	public static RuntimeContext registerContext(NodeDef config,PersistManager defManager){
		if(context == null){
			context = new RuntimeContext(config,new TraceContainer(), defManager);
		}
		return context;
	}

	public static RuntimeContext getContext() {
		if(context == null){
			throw new JwebapInitialException("jwebap not startup successfully,please check the application log.");
		}
		return context;
	}
	

	public SwapDataCache getDataCache() {
		return dataCache;
	}

	/**
	 * 返回当前实例配置
	 * @return
	 */
	public NodeDef getNodeDef(){
		return _config;
	}
	
	/**
	 * 返回jwebap配置管理器
	 * @return
	 */
	public PersistManager getJwebapDefManager(){
		return _jwebapDefManager;
	}
	
	public String getServerName() {
		return serverInfos == null ? null : serverInfos.get("serverName");
	}

	public String getDeployPath() {
		return serverInfos == null ? null : serverInfos.get("deployPath");
	}
	
	public void startup(){
		Collection<ComponentDef> components = _config.getComponents();
		Iterator<ComponentDef> componentIt=components.iterator();
		/**
		 * 注册Components
		 */
		while (componentIt.hasNext()) {			
			ComponentDef def = componentIt.next();
			//未激活则不启动
            if(!def.isActive())continue;
            registerComponent(def.getType(), def);

		}
		LOG.info("component startup finished. register Component Count:"+_components.size());
		
		//注册监控任务
		List<TaskDef> tasks = _config.getTasks();
		if(tasks != null && tasks.size()>0){
			for (TaskDef taskDef : tasks) {
				registerTask(taskDef);
			}
		}
		
		//注册数据同步服务
		registerDataProcessService();
	}

	/**
	 * 注册监控组件
	 * @param type
	 * @param def
	 * @throws RegisterException
	 */
	private void registerComponent(String type, ComponentDef def){
        try {
        	Component component = null;
    		if(HttpComponent.TRACE_TYPE.equals(type)){
    			component = new HttpComponent();
    		}else if(MethodComponent.TRACE_TYPE.equals(type)){
    			component = new MethodComponent();
    		}else if(JdbcComponent.TRACE_TYPE.equals(type)){
    			component = new JdbcComponent();
    		}
    		
    		if(component == null){
    			LOG.warn("[{}][{}]无匹配插件，跳过",def.getName(),type);
    			return ;
    		}
    		
    		ComponentContext context = new StandardComponentContext(getContainer(), this, def);
    		component.startup(context);
    		_components.put(type, component);
    		context.setComponent(component);
    		context.putProperties(def.getProperties());
		} catch (Exception e) {
			e.printStackTrace();
			LOG.warn("[{}][{}]插件启动失败",def.getName(),type);
		}
	}
	
	/**
	 * 注册监控服务
	 * @param task
	 */
	private void registerTask(TaskDef taskdef){
		try {
			if(!taskdef.isActive())return;
			if("CHECK-CONNECTION".equals(taskdef.getType())){
				MonitorTask task = new ServiceConnectionCheckTask(taskdef.getTaskResource(), taskdef.getPeriod());
				task.startup();
				_monitorTasks.put("CHECK-CONNECTION", task);
				LOG.info("[{}][{}]启动 OK",taskdef.getName(),taskdef.getType());
			}
		} catch (Exception e) {
			e.printStackTrace();
			LOG.warn("[{}][{}]启动 fail",taskdef.getName(),taskdef.getType());
		}
	}
	
	/**
	 * 注册数据处理服务
	 */
	private void registerDataProcessService(){
		if(_components.size() == 0)return;
		try {
			DataPolicyDef type = getNodeDef().getDataPolicy();
			if(type !=null){
				if("remote".equals(type.getType())){
					new RemoteDataPolicyClientHandler().startup(this);
				}
			}
		} catch (Exception e) {
			LOG.error("监控数据同步服务启动失败",e);
		}
	}
	
	/**
	 * 注册服务器容器信息
	 */
	public void registerServerInfos(Map<String, String> serverInfos){
		this.serverInfos = serverInfos;
	}

	public Component getComponent(String name) {
		return _components.get(name);
	}
	
	public ComponentContext getComponentContext(String name) {
		Component component = _components.get(name);
		return component == null ? null : component.getComponentContext();
	}
	
	public ComponentDef getComponentDef(String name){
		ComponentDef componentDef = getNodeDef().getComponentDef(name);
		return componentDef;
	}

	public void unregisterComponent(String name) {
		Component component =  _components.get(name);
		component.destory();
		_components.remove(name);
	}

	public TraceLiftcycleManager getContainer() {
		return _container;
	}

	public void setContainer(TraceLiftcycleManager container) {
		this._container = container;
	}

	/**
	 * RuntimeContext是组件的上下文的根
	 */
	public Context getParent() {
		return null;
	}
	
	/**
	 * 获取指定组件属性
	 * @param componentName
	 * @param propName
	 * @return
	 */
	public static String getComponentProps(String componentName,String propName){
		ComponentContext componentContext = getContext().getComponentContext(componentName);
		return componentContext == null ? null : componentContext.getProperty(propName);
	}
	
	
	/**
	 * 判断组件是否激活
	 * @param componentName
	 * @return
	 */
	public static boolean componentIsActive(String componentName){
		ComponentDef def = getContext().getComponentDef(componentName);
		if(def == null)return false;
		return def.isActive();
	}
}