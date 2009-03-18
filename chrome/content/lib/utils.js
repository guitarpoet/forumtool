//
// This is the utility library for forum tools.
//
//
// @author Jack <guitarpoet@gmail.com>
// @date 08/11/23
//

forumtool = {};

forumtool.isDebug = true;

forumtool.debug = function(message){
	if(forumtool.isDebug)
		dump(message);
}

forumtool.checkDir = function(dir){
	if(!this.profileDir.exists()){
		forumtool.debug("Creating" + this.profileDir);
		this.profileDir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0700);
	}
}