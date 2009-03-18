//
// This is the script for cookie switcher, it is inspired by the CookieSwap by Steven Tine
//
// @author Jack
// @date 08/11/23
//
forumtool.Profile = Class.create({
	//	summary:
	//		The profile object for user switch profile.
	initialize : function(file){
		//	summary:
		//		Initiaze the object with the profile file. It will use 
		//		the name to fetch the profile
		forumtool.debug("Initializing profile.");
		this.cookies = FileIO.read(file).split("\n");
		this.file = file;
	},
	
	save : function(){
		//	summary:
		//		Save the change to the profile file.
		FileIO.write(this.file, this.cookies.join("\n"));
	},
	
	remove : function(){
		FileIO.unlink(this.file);
	}
});

forumtool.getProfiles = function(){
	var ret = $A([]);
	forumtool.debug("Getting dir.");
	// get profile directory
	var profileDir = Components.classes["@mozilla.org/file/directory_service;1"]
                     .getService(Components.interfaces.nsIProperties)
                     .get("ProfD", Components.interfaces.nsIFile);
    profileDir.append("forumtool");
    forumtool.checkDir(profileDir);
    profileDir.append("profiles");
    forumtool.checkDir(profileDir);
    var files = this.profileDir.directoryEntries;
    while (files.hasMoreElements()){
		ret.push(new forumtool.Profile(files.next()));
    }
	return ret;
}

forumtool.saveProfiles = function(profiles){
	$A(profiles).each(function(profile){
		profile.save();
	});
}