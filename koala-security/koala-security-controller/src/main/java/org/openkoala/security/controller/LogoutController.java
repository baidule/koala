package org.openkoala.security.controller;

import org.apache.shiro.SecurityUtils;
import org.openkoala.security.facade.dto.JsonResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

public class LogoutController {

	private static final Logger LOGGER = LoggerFactory.getLogger(LogoutController.class);

	/**
	 * 用户退出。
	 * 
	 * @return
	 */
	@ResponseBody
	@RequestMapping(value = "/logout", method = RequestMethod.POST)
	public JsonResult logout() {
		JsonResult jsonResult = new JsonResult();
		try {
			SecurityUtils.getSubject().logout();
			jsonResult.setSuccess(true);
			jsonResult.setMessage("用户退出成功。");
		} catch (Exception e) {
			LOGGER.error(e.getMessage());
			jsonResult.setSuccess(false);
			jsonResult.setMessage("用户退出失败。");
		}
		return jsonResult;
	}
}