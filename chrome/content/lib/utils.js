//
// This is the utility library for forum tools.
//
//
// @author Jack <guitarpoet@gmail.com>
// @date 08/11/23
//

forumtool = {};

forumtool.isDebug = true;

ServiceLocator = {
	io: 
		Components.classes["@mozilla.org/network/io-service;1"]
			.getService(Components.interfaces.nsIIOService),
	cookie: 
		Components.classes["@mozilla.org/cookieService;1"]
			.getService()
			.QueryInterface(Components.interfaces.nsICookieService),
	cookieManager:
		Components.classes["@mozilla.org/cookiemanager;1"]
			.getService()
			.QueryInterface(Components.interfaces.nsICookieManager),
	superCookieManager :
		Components.classes["@mozilla.org/cookiemanager;1"]
			.getService()
			.QueryInterface(Components.interfaces.nsICookieManager2),
	getProfDir : function() {
		return Components.classes["@mozilla.org/file/directory_service;1"]
			.getService(Components.interfaces.nsIProperties)
			.get("ProfD", Components.interfaces.nsIFile);
	} 
}

/*
	name	ACString	The name of the cookie. Read only.
	value	ACString	The cookie value. Read only.
	isDomain	boolean	True if the cookie is a domain cookie, false otherwise. Read only.
	host	AUTF8String	The host (possibly fully qualified) of the cookie. Read only.
	path	AUTF8String	The path pertaining to the cookie. Read only.
	isSecure	boolean	True if the cookie was transmitted over ssl, false otherwise. Read only.
	expires	PRUint64	Expiration time (local timezone) expressed as number of seconds since Jan 1, 1970. Read only.
	status	nsCookieStatus	Holds the P3P status of cookie. Read only.
	policy	nsCookiePolicy	Holds the site's compact policy value. Read only.
*/
forumtool.Cookie = Class.create();

forumtool.Cookie.prototype = {
	initialize: function(name, value, isDomain, host, path, isSecure, expires, status, policy) {
		this.name = name;
		this.value = value;
		this.isDomain = isDomain;
		this.host = host;
		this.path = path;
		this.isSecure = isSecure;
		this.expires = expires;
		this.status = status;
		this.policy = policy;
	},
	
	toString: function() {
		return Object.toJSON(this);
	}
}

forumtool.findCookies = function(domain) {
	var ret = $A([]);
	var enumerator = ServiceLocator.cookieManager.enumerator;
	while (enumerator.hasMoreElements()){
    	var nextCookie = enumerator.getNext();
    	if (!nextCookie) break;
      	nextCookie = nextCookie.QueryInterface(Components.interfaces.nsICookie);
      	var host = nextCookie.host;
      	if (domain && host.indexOf(domain) == -1 ) continue;
      	if (nextCookie.policy != Components.interfaces.nsICookie.POLICY_UNKNOWN)
        	showPolicyField = true;
        ret.push(new forumtool.Cookie(nextCookie.name, nextCookie.value, nextCookie.isDomain,
        	(host.charAt(0)==".") ? host.substring(1,host.length) : host,
        	nextCookie.path, nextCookie.isSecure, nextCookie.expires * 1000,
        	nextCookie.status, nextCookie.policy));
    }
	return ret;
};

forumtool.getDomain = function (url) {
	var arr = url.split('//');
	return arr[1].substr(arr[1].indexOf('.'), arr[1].indexOf('/') - arr[1].indexOf('.'));
}

forumtool.getUrlBase = function (url) {
	var arr = url.split('//');
	return arr[0] + '//' + arr[1].substr(0, arr[1].indexOf('/'));
}

forumtool.debug = function(message){
	if(forumtool.isDebug)
		dump(message);
}

forumtool.gotoDir = function(dir) {
	
};

forumtool.checkDir = function(dir){
	if(!dir.exists()){
		forumtool.debug("Creating -> " + dir);
		dir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0700);
	}
}

forumtool.getUri = function(url) {
	return ServiceLocator.io.newURI(url, null, null);
}

forumtool.getCookieString = function(url) {
	return ServiceLocator.cookie.getCookieString(forumtool.getUri(url), null);
}

forumtool.setCookieString = function (uri, cookie) {
	ServiceLocator.cookie.setCookieString(uri, null, cookie, null);
}

forumtool.setCookie = function(newCookie){
	var uri = Components.classes["@mozilla.org/network/standard-url;1"].createInstance(Components.interfaces.nsIURI);

   	//lets specify the uri.spec https if such just in case
   	var HttpProtocol = newCookie.isSecure ? "https://" : "http://"
   	uri.spec = HttpProtocol + newCookie.host + newCookie.path;

	var cookieString = '';
	cookieString = cookieString + newCookie.name + "=" + newCookie.value + ";"; 

	if (newCookie.isDomain)
		cookieString = cookieString + "domain=" + newCookie.host +";"

	if (newCookie.expires)
		cookieString = cookieString + "expires=" + (new Date(newCookie.expires)) + ";"

	cookieString = cookieString + "path=" + newCookie.path + ";"

	if (HttpProtocol == "https://")
		cookieString = cookieString + "secure"

	forumtool.setCookieString(uri, cookieString);
}