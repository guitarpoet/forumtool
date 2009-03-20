forumtool.getProfilesDir = function() {
	var dir = ServiceLocator.getProfDir();
	dir.append('cookieProfiles');
	forumtool.checkDir(dir);
	dir.append(getDomain());
	forumtool.checkDir(dir);
	return dir;
}

forumtool.getProfiles = function() {
	var ret = $A([]);
	var files = forumtool.getProfilesDir().directoryEntries;
	while (files.hasMoreElements()){
		var e = files.getNext();
		e.QueryInterface(Components.interfaces.nsIFile);
		ret.push(e);
    }
	return ret;
}


forumtool.saveProfile = function(){
	 var params = {
		inn : null, 
		out : null
	 };       
	 window.openDialog("chrome://forumtool/content/getProfileNameDialog.xul", "",
	   "chrome, dialog, modal, resizable=yes", params).focus();
	 if (params.out) {
		var dir = getProfilesDir();
		dir.append(params.out);
		FileIO.write(dir, Object.toJSON(forumtool.findCookies(getDomain())));
	 }
	 else {
	   // User clicked cancel. Typically, nothing is done here.
	 }
}