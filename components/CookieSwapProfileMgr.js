//-----------------------------
//interfaces we support
const nsIProfile = Components.interfaces.nsIProfile;
const nsISupports = Components.interfaces.nsISupports;

//class constants (obtained ID from http://extensions.roachfiend.com/cgi-bin/guid.pl)
const CLASS_ID = Components.ID("{5bec83aa-b019-4ff2-8e26-ec6de45aca4b}");
const CLASS_NAME = "CookieSwap Profile Manager";
const CONTRACT_ID = "@cookieswap.mozdev.org/profile/manager-service;1";

const COOKIE_SWAP_COMP_DEBUG_ENABLED = false;
function cookieswap_dbg(str)
{
   if(COOKIE_SWAP_COMP_DEBUG_ENABLED == true)
  {
      //To log to the javascript console (Tools->Error Console) use these lines
      //var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
      //                           .getService(Components.interfaces.nsIConsoleService);
      //consoleService.logStringMessage("[cookieswap]" + str );

      dump("[CookieSwapProfMgr]" + str + "\n");

   }
}

//class constructor
function CookieSwapProfileMgr() {
  this._profileCount = 10;  //TODO
  this._profileContainer = CookieProfileContainer_getInstance();
  //Show the currently active profile as active on the UI
  this._currentProfile = this._profileContainer.getActiveProfileId();

};


//class definition
CookieSwapProfileMgr.prototype = {
  _currentProfile: null,
  _profileCount: null,
  _profileContainer: null,

  //--------------------------------------------------------
  //property of nsIProfile interface (setter/getter methods)
  //--------------------------------------------------------
  get currentProfile() { return this._currentProfile; },
  set currentProfile(aValue) { this.changeCurrentProfile(aValue); },
  get profileCount() { return this._profileCount; },

  //-------------------------------
  //methods of nsIProfile interface
  //-------------------------------

  //----cloneProfile-----
  cloneProfile: function(profName) {
    cookieswap_dbg("cloneProfile " + profName + "\n");
    this._profileCount = this._profileCount + 1;
    return;
  },

  //---createNewProfile-----
  //---Only use the profName for CookieSwap
  createNewProfile: function(profName, profDir, langCode, useExistingDir) {
    cookieswap_dbg("Creating" + profName + "\n");
  },

  //---deleteProfile-----
  //---CookieSwap changes the definition of this method slightly.  If
  //---  canDeleteFile is true then the profile is completely deleted and
  //---  removed as a profile.  If canDeleteFile is false, then the contents
  //---  (i.e. cookies) of the profile are deleted, but the profile still
  //---  exists.
  deleteProfile: function(profName, canDeleteFile) {
    cookieswap_dbg("Deleting" + profName + "\n");
    if (canDeleteFile == true)
       cookieswap_dbg("Not implemented...Deleting profile and file\n");
    else
    {
       cookieswap_dbg("Deleting cookies associated with " + profName + "\n");
       var req_profile = this._profileContainer.getProfile(profName);
       if (req_profile != null)
       {
          //Clear all cookies in the requested profile
          req_profile.clearAllCookies();
       }
       else
       {
          cookieswap_dbg("Invalid profile name [" + profName + "] passed in\n");
       }
    }

  },

  //---getProfileList-----
  getProfileList: function(obj) {
    var profile_array = new Array();

    //Populate the UI with the profiles available
    for(var i=0; i<this._profileContainer.getNumOfProfiles(); i++)
    {
       profile_array[i] = this._profileContainer.getProfileName(i);
       cookieswap_dbg("Returning profile: " + profile_array[i]);
    }

    obj.value = profile_array.length;

    return profile_array;
  },
  
  //---profileExists-----
  profileExists: function(profName) {
     if (profName == "test")
        return true;
     else
        return false; 
  },

  //---renameProfile-----
  renameProfile: function(oldProfName, newProfName) {
    cookieswap_dbg("Rename from " + oldProfName + " to " + newProfName + "\n");
  },
  
  //---shutDownCurrentProfile-----
  shutDownCurrentProfile: function(type) {
    cookieswap_dbg("Shutdown type= " + type + "\n");
  },

  //--------------------------------------------------------------------------
  //Private methods of CookieSwapProfileMgr (not part of an exposed Interface)
  //--------------------------------------------------------------------------
  //----notifyObserversOfSwap-----
  notifyObserversOfSwap: function(profName) {
     //Notify all the observers of the new profiles swapped in
     Components.classes["@mozilla.org/observer-service;1"]
         .getService(Components.interfaces.nsIObserverService)
         .notifyObservers(null, "cookieswap_swap", profName);
  },

  //----changeCurrentProfile-----
  changeCurrentProfile: function(profName) {
    cookieswap_dbg("changeCurrentProfile to " + profName + "\n");
    this._currentProfile = profName;

   cookieswap_dbg("START switchProfile to " + profName);

   var old_profile_id = this._profileContainer.getActiveProfileId();
   var new_profile_id = profName;

   //First thing to do is copy all the cookies from the browser and
   //  save them to the profile being swapped out
   if (old_profile_id != INVALID_PROFILE_ID)
   {
      cookieswap_dbg("Starting copyFromBrowser");
      var old_profile = this._profileContainer.getProfile(old_profile_id);
      old_profile.copyFromBrowser();
   }
   else
   {
      //The only normal case where this should happen is if the browser crashes
      //  during a swap and we come up and no profiles are active.  On the next
      //  first swap, the old profile will be INVALID
      cookieswap_dbg("Profile out is invalid...an ERROR if not the first swap after a crash");
   }

   //Next thing to do is to remove the cookies from the browser and copy
   //  in all the cookies associated with the profile being swapped in.
   //BUT, first ensure we set the ActiveProfileID to INVALID so that if
   //  we were to crash, all our profiles will be intact in persistent
   //  memory and we won't come up thinking that the cookies in the browers
   //  are associated with any profile.
   cookieswap_dbg("Setting to INVALID_PROFILE_ID");
   this._profileContainer.setActiveProfileId(INVALID_PROFILE_ID);
   this.notifyObserversOfSwap(INVALID_PROFILE_ID);

   //Remove all the browser cookies
   cookieswap_dbg("removingAllCookies");
   cookieswap_removeAllCookies();
  
   if (new_profile_id != INVALID_PROFILE_ID)
   {
      //Now swap in the cookies from the profile to the browser
      var new_profile = this._profileContainer.getProfile(new_profile_id);

      cookieswap_dbg("Starting copyToBrowser");
      new_profile.copyToBrowser();
      cookieswap_dbg("Setting activeProfileID to " + new_profile_id);
      this._profileContainer.setActiveProfileId(new_profile_id);
      this.notifyObserversOfSwap(new_profile_id);

      cookieswap_dbg("Swap from profile " + old_profile_id + " to " + new_profile_id + " complete");
   }
   else
   {
      alert("[cookieswap] Internal error, profile in is invalid...no cookies swapped in");
   }
   
   cookieswap_dbg("END switchProfile");
  },

  //-------------------------------
  //method of nsISupports interface
  //-------------------------------
  QueryInterface: function(aIID)
  {
    if (!aIID.equals(nsIProfile) &&    
        !aIID.equals(nsISupports))
      throw Components.results.NS_ERROR_NO_INTERFACE;
    return this;
  }
};

//Factory definition
var CookieSwapProfileMgrFactory = {
  createInstance: function (aOuter, aIID)
  {
    cookieswap_dbg("Creation" + "\n");
    if (aOuter != null)
      throw Components.results.NS_ERROR_NO_AGGREGATION;
    return (new CookieSwapProfileMgr()).QueryInterface(aIID);
  }
};

//module definition (xpcom registration)
var CookieSwapProfileMgrModule = {
  _firstTime: true,
  registerSelf: function(aCompMgr, aFileSpec, aLocation, aType)
  {
    if (this._firstTime) {
      this._firstTime = false;
      throw Components.results.NS_ERROR_FACTORY_REGISTER_AGAIN;
    };
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.registerFactoryLocation(CLASS_ID, CLASS_NAME, CONTRACT_ID, aFileSpec, aLocation, aType);
  },

  unregisterSelf: function(aCompMgr, aLocation, aType)
  {
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(CLASS_ID, aLocation);        
  },
  
  getClassObject: function(aCompMgr, aCID, aIID)
  {
    if (!aIID.equals(Components.interfaces.nsIFactory))
      throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    if (aCID.equals(CLASS_ID))
      return CookieSwapProfileMgrFactory;

    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

  canUnload: function(aCompMgr) { return true; }
};

//module initialization
function NSGetModule(aCompMgr, aFileSpec) { return CookieSwapProfileMgrModule; }

function cookieswap_removeAllCookies()
{
   var cookie_mgr = ffGetCookieManager();
   cookie_mgr.removeAll();
   cookieswap_dbg("All cookies removed");
}

// *****************************************************************************
// *                    CookieProfileContainer Class                           *
// *                                                                           *
// ************************** Coding Standards *********************************
// *  gMyVariable     - global variable (starts with "g", then mixed case)     *
// *  myVariable      - variables passed into functions                        *
// *  my_variable     - local variable inside of a function                    *
// *  this.myVariable - class attributes/variable (mixed case & always         *
// *                    referenced with "this.")                               *
// *  MyFunction      - functions are always mixed case                        *
// *  MY_CONSTANT     - constants are all caps with underscores                *
// *                                                                           *
// *************************** Revision History ********************************
// *  Name       Date       BugzID  Action                                     *
// *  ---------  ---------  -----   ------                                     *
// *  SteveTine  28Dec2005  12561   Initial Creation                           *
// *  SteveTine  30Sep2006  15281   Dealing with difference in moveTo on Linux *
// *                                                                           *
// ************************* BEGIN LICENSE BLOCK *******************************
// * Version: MPL 1.1                                                          *
// *                                                                           *
// *The contents of this file are subject to the Mozilla Public License Version*
// * 1.1 (the "License"); you may not use this file except in compliance with  *
// * the License. You may obtain a copy of the License at                      *
// * http://www.mozilla.org/MPL/                                               *
// *                                                                           *
// * Software distributed under the License is distributed on an "AS IS" basis,*
// * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License  *
// * for the specific language governing rights and limitations under the      *
// * License.                                                                  *
// *                                                                           *
// * The Original Code is the CookieSwap Mozilla/Firefox Extension             *
// *                                                                           *
// * The Initial Developer of the Original Code is                             *
// * Steven Tine.                                                              *
// * Portions created by the Initial Developer are Copyright (C) 2006          *
// * the Initial Developer. All Rights Reserved.                               *
// *                                                                           *
// * Contributor(s): Steven Tine                                               *
// *                                                                           *
// **************************END LICENSE BLOCK**********************************

//Static instance attribute
var gCookieProfileContainer_instance = null;

const INVALID_PROFILE_ID="";
const INVALID_PROFILE_NUM=-1;
const COOKIE_SWAP_DIR_NAME="CookieSwap";
const COOKIE_SWAP_DIR_PERMISSIONS = 0700;  //The dir is user r/w/x only

const COOKIE_FILE_PREFACE="cookies_";  //All profile files start with this string
const INACT_COOKIE_FILE_EXT="txt";    //Inactive profiles have this file extension
const ACTV_COOKIE_FILE_EXT="tx1";     //Active profiles have this file extension

const DEF_PROFILE1_FILENAME = COOKIE_FILE_PREFACE + "Profile1" + "." + ACTV_COOKIE_FILE_EXT;
const DEF_PROFILE2_FILENAME = COOKIE_FILE_PREFACE + "Profile2" + "." + INACT_COOKIE_FILE_EXT;
const DEF_PROFILE3_FILENAME = COOKIE_FILE_PREFACE + "Profile3" + "." + INACT_COOKIE_FILE_EXT;

//-------------------CookieProfileContainer class def---------------------
//The CookieProfileContainer class handles keeping track of where all the CookieProfiles
// are stored and determining which profile is active.  
// It also enables the user to add/remove profiles.
//This class is a singleton, so there is only one in existance.  Use the
// CookieProfileContainer_getInstance() to get the instance of the class.
function CookieProfileContainer()
{
   //Define a debug function for the class...change true/false to turn it on/off
   this.classDump=function(s){true ? cookieswap_dbg("[CookieProfileContainer]" + s) : (s)}

   //This is the way to call the debug function
   this.classDump("START ctor");

   ////--TEMP HARDCODED PROFILES UNTIL PERS STORAGE FIGURED OUT--
   this.profileArray = new Array();
   this.activeProfileId = INVALID_PROFILE_ID;

   //This will get the directory of the current Mozilla profile.
   //  We'll put the CookieSwap dir under there since Firefox's cookies.txt file
   //  is stored in this profile dir.
   this.profileDir = Components.classes["@mozilla.org/file/directory_service;1"]
                        .getService(Components.interfaces.nsIProperties)
                        .get("ProfD", Components.interfaces.nsIFile);
   this.profileDir.append(COOKIE_SWAP_DIR_NAME);

   //If the CookieSwap directory doesn't exist, this is the first time that
   //  the CookieSwap extension has run.  Create the directory and also
   //  create the default profile files.
   if( (this.profileDir.exists() != true) || (this.profileDir.isDirectory() != true) ) 
   { 
      this.classDump("First time CookieSwap has been run...creating " + COOKIE_SWAP_DIR_NAME);

      //Create the directory
      this.profileDir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, COOKIE_SWAP_DIR_PERMISSIONS);

      //Make a few copies of the directory handle
      var def_profile1 = this.profileDir.clone()
      var def_profile2 = this.profileDir.clone()
      var def_profile3 = this.profileDir.clone()

      //Append the filenames to the directory
      def_profile1.append(DEF_PROFILE1_FILENAME);
      def_profile2.append(DEF_PROFILE2_FILENAME);
      def_profile3.append(DEF_PROFILE3_FILENAME);

      //Now create the default files
      def_profile1.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, COOKIE_FILE_PERMISSIONS);
      def_profile2.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, COOKIE_FILE_PERMISSIONS);
      def_profile3.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, COOKIE_FILE_PERMISSIONS);
   }

   //Let's enumerate through all the files in the CookieSwap directory
   var files = this.profileDir.directoryEntries;
   var i=0;

   this.classDump("Recursing the profileDir..." + files.hasMoreElements());

   while (files.hasMoreElements())
   {
      //Get the next file an QI to a nsIFile object
      var curr_file = files.getNext();
      curr_file.QueryInterface(Components.interfaces.nsIFile);

      //Convert to convient String
      var file_name  = new String(curr_file.leafName);
      this.classDump("--File located...Name=" + file_name);

      //Now split off the preface of the filename used for cookie files
      var fname_split = file_name.split(COOKIE_FILE_PREFACE);
      this.classDump("Num of split is " + fname_split.length);
    
      //If the split found the preface, then the file is likely a cookie file
      if (fname_split.length > 1)
      {
         //Now split off the extension so we can get the extension and the profile name
         //  If we find more than that, the file is not valid...likely a swap file
         //  left around when someone edited the valid cookie file
         var  profile_name = fname_split[1].split(".");

         //At this point, profile_name[0]=ProfileName, profile_name[1]=file extension
         //  if there are more than 2 elements in the split then we don't have the
         //  above scenario...not valid
         if(profile_name.length == 2)
         {
            this.classDump("Profile #" + i + " : Name=" + profile_name[0] + ", ext=" + profile_name[1]);

            //We have a valid cookie profile file...create the CookieProfile object
            this.profileArray[i] = new Object();
            this.profileArray[i].profile = new CookieProfile(curr_file);
            this.profileArray[i].name = profile_name[0];

            //If the file extension shows it as active, track it
            if (profile_name[1] == ACTV_COOKIE_FILE_EXT)
            {
               this.classDump("Profile #" + i + " is active");
               this.activeProfileId = this.profileArray[i].name;
            }

            //Increment the valid profile counter
            i++;
         }
      }

   }
       
   //This is the way to call the debug function
   this.classDump("END ctor");
}

//This "static" method returns the singleton instance of this class
function CookieProfileContainer_getInstance()
{
   if (gCookieProfileContainer_instance == null)
   {
      //If this is the first time this method is being called, create the singleton
      //  instance of the class and return it.
      gCookieProfileContainer_instance = new CookieProfileContainer();
   }

   return gCookieProfileContainer_instance;
}

//This method returns the number of profiles that exist in this container.
CookieProfileContainer.prototype.getNumOfProfiles = function()
{
   return(this.profileArray.length); 
}

//This method returns a string that is the name of the profileID passed in.
//  null is returned if the profileID is invalid.
CookieProfileContainer.prototype.getProfileName = function(profileNum)
{
   if (profileNum < this.profileArray.length)
   {
      return(this.profileArray[profileNum].name);
   }
   else
   {
      this.classDump("Invalid Num (" + profileNum + ") passed in to getProfileName of " + this.profileArray.length);
      return(null);
   }
}

//This method returns a string that is the name of the profileID passed in.
//  null is returned if the profileID is invalid.
CookieProfileContainer.prototype.getProfileNum = function(profileId)
{
   var prof_num=INVALID_PROFILE_NUM;
 
   if (profileId != INVALID_PROFILE_ID)
   {
      //Search the profileArray for the passed in ID
      for(var i=0; i<this.profileArray.length; i++)
      {
         if (this.profileArray[i].name == profileId)
            prof_num = i;   //Found the profileName
      }

      //If after searching the array we still didn't find the ID...it's an error
      if (prof_num == INVALID_PROFILE_NUM)
      {
         this.classDump("ERROR Invalid Name '" + profileId + "' passed in to getProfileNum. Len=" + this.profileArray.length);
      }
   }

   return(prof_num);
}

//This method returns a CookieProfile class object corresponding to the profileID
//  passed in.  If not profile with that profileID exists, null is returned.
CookieProfileContainer.prototype.getProfile = function(profileId)
{
   var profile_num = this.getProfileNum(profileId);

   if (profile_num < this.profileArray.length)
   {
      return(this.profileArray[profile_num].profile);
   }
   else
   {
      this.classDump("Invalid ID (" + profileId + "which translated to " + profile_num + ") passed in to getProfile of " + this.profileArray.length);
      return(null);
   }
}

//This method adds the passed in CookieProfile object passed in to the containder.
//  The profile ID is returned.
CookieProfileContainer.prototype.addProfile = function(profileName)
{
   this.classDump("--UNIMPLEMENTED METHOD---- addProfile()");//Still need to perform file operations
   //The next availabe index in the array is the length
   //var next_index = this.profileArray.length;

   return(INVALID_PROFILE_ID);
}

CookieProfileContainer.prototype.removeProfile = function(profileId)
{
   this.classDump("--UNIMPLEMENTED METHOD---- removeProfile()");//Still need to perform file operations
   if (profileId < this.profileArray.length)
   {
      var i;
      var array_len = this.profileArray.length;
      //In order to keep the profiles in numerical order, remove the profile
      //  and shift all the other profiles up.
      //[TODO] Not sure if this is the right thing to do because other classes
      //  may have references to the old profileIDs....
      for(i=profileId; i<(profile_len - 1); i++)
      {
         //One by one shift up the profiles in the array
         this.profileArray[i].profile = this.profileArray[i+1].profile;
         this.profileArray[i].name = this.profileArray[i+1].name;
      }

      //Now null out the last entry in the array
      this.profileArray[i].profile = null;
      this.profileArray[i].name = null;
   }
   else
   {
      this.classDump("Invalid ID passed in to getProfile");
   }

   return(this.profileArray.length);
}

//Returns the profileID of the active profile
CookieProfileContainer.prototype.getActiveProfileId = function()
{
   return(this.activeProfileId);
}

//Changes the active profile to the profileID pased in.  The active profileID
//  is returned.  If it doesn't match the profileId passed in, then it was
//  not accepted as a valid profile to make active.
CookieProfileContainer.prototype.setActiveProfileId = function(new_profile_id)
{
   this.classDump("START setActiveProfileId( " + new_profile_id + ")");

   var old_profile_id = this.activeProfileId;
   var old_profile_num = this.getProfileNum(old_profile_id);
   this.classDump("Old profile '" + old_profile_id + "' is num " + old_profile_num);

   var new_profile_num = this.getProfileNum(new_profile_id);
   this.classDump("New profile '" + new_profile_id + "' is num " + new_profile_num);

   //If the currently active profile is valid, rename that profile's filename to indicate
   //  that is no longer the active profile
   if ((old_profile_id != INVALID_PROFILE_ID)  && (old_profile_num < this.profileArray.length))
   {
      this.classDump("START rename of old profile");

      var i = old_profile_num;
      var fileHandle = this.profileArray[i].profile.getFileHandle();

      //Renaming to inactive filename
      this.classDump("Renaming " + this.profileArray[i].name + " (old profile)");
      this.profileArray[i].profile.setFileHandle(this.moveFile(fileHandle, COOKIE_FILE_PREFACE + this.profileArray[i].name + "." + INACT_COOKIE_FILE_EXT));
   }

   //If the new profileID is valid, rename that profile's file to indicate that it
   //  is the active profile
   if ((new_profile_num != INVALID_PROFILE_NUM)  && (new_profile_num < this.profileArray.length))
   {
      var i = new_profile_num;  //Rename new_profile_num to a shorter var
      var fileHandle = this.profileArray[i].profile.getFileHandle();
         
      //Renaming to active filename
      this.classDump("Renaming " + this.profileArray[i].name + " (new profile)");
      this.profileArray[i].profile.setFileHandle(this.moveFile(fileHandle, COOKIE_FILE_PREFACE + this.profileArray[i].name + "." + ACTV_COOKIE_FILE_EXT));
   }
   else
   {
      //The profile passed in is not valid.
      //This is an error condition unless we are swapping to the INVALID_PROFILE_ID
      if (new_profile_id != INVALID_PROFILE_ID)
      {
         this.classDump("ERROR Invalid ID '" + new_profile_id + "' passed in to setActiveProfileId");
         new_profile_id = INVALID_PROFILE_ID;  //Non-valid ID passed in, make it INVALID
      }
   }
      
   this.activeProfileId = new_profile_id;
   this.classDump("END setActiveProfileId( " + new_profile_id + ")");
   
   return(this.activeProfileId);
}

CookieProfileContainer.prototype.moveFile = function(fileHandle, newFileName)
{
   this.classDump("---move start (from '" + fileHandle.leafName + "' to '" +  newFileName + "')---");

   //Actually rename the file to the new name
   fileHandle.moveTo(null, newFileName);

   //On certain OSs (i.e. Linux), the call to moveTo does not update the fileHandle to point
   //  to the new file.  In that case, update it manually
   if (fileHandle.leafName != newFileName)
   {
      //Replace the existing filename portion of the path with the new filename portion of the path
      newFilePath = fileHandle.path.replace(fileHandle.leafName, newFileName);

      this.classDump("Needing to update fileHandle on this OS from '" + fileHandle.path + "' to '" + newFilePath);

      //Create a new nsIFile object and point it to the new file
      fileHandle = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
      fileHandle.initWithPath(newFilePath);
   }

   this.classDump("---move end---");
   return(fileHandle);
}

// *****************************************************************************
// *                        CookieProfile Class                                *
// *                                                                           *
// ************************** Coding Standards *********************************
// *  gMyVariable     - global variable (starts with "g", then mixed case)     *
// *  myVariable      - variables passed into functions                        *
// *  my_variable     - local variable inside of a function                    *
// *  this.myVariable - class attributes/variable (mixed case & always         *
// *                    referenced with "this.")                               *
// *  MyFunction      - functions are always mixed case                        *
// *  MY_CONSTANT     - constants are all caps with underscores                *
// *                                                                           *
// *************************** Revision History ********************************
// *  Name       Date       BugzID  Action                                     *
// *  ---------  ---------  -----   ------                                     *
// *  SteveTine  28Dec2005  12561   Initial Creation                           *
// *  SteveTine  11Jan2006  12720   Fixing the way session cookies are handled *
// *  SteveTine  30Sep2006  15281   Adding setFileHandle method                *
// *  SteveTine  16Jan2006  Trac9   Create cs_Cookie instead of Cookie class   *
// *                                                                           *
// ************************* BEGIN LICENSE BLOCK *******************************
// * Version: MPL 1.1                                                          *
// *                                                                           *
// *The contents of this file are subject to the Mozilla Public License Version*
// * 1.1 (the "License"); you may not use this file except in compliance with  *
// * the License. You may obtain a copy of the License at                      *
// * http://www.mozilla.org/MPL/                                               *
// *                                                                           *
// * Software distributed under the License is distributed on an "AS IS" basis,*
// * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License  *
// * for the specific language governing rights and limitations under the      *
// * License.                                                                  *
// *                                                                           *
// * The Original Code is the CookieSwap Mozilla/Firefox Extension             *
// *                                                                           *
// * The Initial Developer of the Original Code is                             *
// * Steven Tine.                                                              *
// * Portions created by the Initial Developer are Copyright (C) 2006          *
// * the Initial Developer. All Rights Reserved.                               *
// *                                                                           *
// * Contributor(s): Steven Tine                                               *
// *                                                                           *
// **************************END LICENSE BLOCK**********************************

const FLAGS_PR_RDONLY      = 0x01; //Open for reading only.
const FLAGS_PR_WRONLY      = 0x02; //Open for writing only.
const FLAGS_PR_RDWR        = 0x04; //Open for reading and writing.
const FLAGS_PR_CREATE_FILE = 0x08; //If the file does not exist, the file is created.
const FLAGS_PR_APPEND      = 0x10; //The file pointer is set to the end of the file prior to each write.
const FLAGS_PR_TRUNCATE    = 0x20; //If the file exists, its length is truncated to 0.
const FLAGS_PR_SYNC        = 0x40; //If set, each write will wait for both the file data and file status 
                                   //  to be physically updated.
const FLAGS_PR_EXCL        = 0x80; //With PR_CREATE_FILE, if the file does not exist, the file is created. 
                                   //  If the file already exists, no action and NULL is returned

const COOKIE_FILE_PERMISSIONS = 0600;  //User read/write only (matches Linux cookies.txt file perm)
const COOKIE_FILE_READ_FLAGS  = FLAGS_PR_RDONLY;
const COOKIE_FILE_WRITE_FLAGS = FLAGS_PR_WRONLY | FLAGS_PR_CREATE_FILE | FLAGS_PR_TRUNCATE;

const CS_NEW_LINE = "\n";  //"\r\n"
const COOKIE_FILE_HDR = 
    "#This file was created by the CookieSwap extension...see cookieswap.mozdev.org" + CS_NEW_LINE + 
    "#NOTE: if this file's extension is 'tx1' then this is an" + CS_NEW_LINE + 
    "# active profile and the cookies in here are old and will be overwritten by the " +  CS_NEW_LINE + 
    "# cookies being managed by the browser" + CS_NEW_LINE;

//-------------CookieProfile class definition--------------
//This class abstracts the idea of how a profile is persistently stored.  This class
//  also knows how to copy cookies to/from the browser.
//Input: fileName - nsIFile object where the persistent info of this class is stored
function CookieProfile(fileName)
{
   //Define a debug function for the class...change true/false to turn it on/off
   this.classDump=function(s){true ? cookieswap_dbg("[CookieProfile]" + s) : (s)}

   //This is the way to call the debug function
   this.classDump("START ctor");

   //--Create some attributes

   //nsIFile object identifying where the persistent info of this class is stored
   this.fileName = fileName;

   //We need to keep track of if this is the first time this profile is being
   //  swapped in for this running of the browser.  If the user just started
   //  the browser up and they are swapping in this profile for the first time,
   //  "session" cookies (one that expire at the end of the browser session) should
   //  not be swapped in (they should be deleted).
   //But, if the session cookies were swapped out to this profile in the same browser
   //  session, then they should be swapped in also.
   this.cookiesCameFromThisSession = false;

   this.classDump("END ctor");
}

//Returns NsIFile
CookieProfile.prototype.getFileHandle = function()
{
   return(this.fileName);
}

//Sets the NsIFile
CookieProfile.prototype.setFileHandle = function(newFile)
{
   this.fileName = newFile;
}

CookieProfile.prototype.clearAllCookies = function()
{
   //To clear all the cookies in this profile, create an empty file (which
   //  removes the old file) and then just close it.
   var file_stream = this.getEmptyFile();
   file_stream.close(); 
}

CookieProfile.prototype.getEmptyFile = function()
{
   var file_out_stream = ffGetFileOutputStream();

   //Create an empty file that will contain the profile's cookies
   this.classDump("opening " + this.fileName.leafName + " for writing");
   file_out_stream.init(this.fileName, COOKIE_FILE_WRITE_FLAGS, COOKIE_FILE_PERMISSIONS, 0);

   //Write the header to the file
   tmp_string = COOKIE_FILE_HDR;
   file_out_stream.write(tmp_string, tmp_string.length);

   this.classDump("Header written");

   return(file_out_stream);  //It is assumed the caller will call file_out_stream.close()
}

//NOTE this method will copy all the cookies in the Profile to the browser.  It
//  will NOT delete the cookies currently in the browser so the caller should
//  remove the browser cookies first if that is desired.
CookieProfile.prototype.copyToBrowser = function()
{
   var istream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                           .createInstance(Components.interfaces.nsIFileInputStream);
   var cookie_svc=ffGetCookieService();
   var i=0;
   var file_valid=true;
   
   this.classDump("Opening " + this.fileName.leafName + " file for reading");

   try
   {
      istream.init(this.fileName, COOKIE_FILE_READ_FLAGS, COOKIE_FILE_PERMISSIONS, 0);
      this.classDump("Open, converting to nsILineInputStream");
      istream.QueryInterface(Components.interfaces.nsILineInputStream);
   }
   catch (e)
   {
      this.classDump("init failed=>" + e);
      file_valid=false;
   }
 
   if (file_valid == true)
   {
      this.classDump("Open...reading");

      //read lines into array
      var line = {};
      var hasmore;
   
      do
      {
         hasmore = istream.readLine(line);
         var str_line = new String(line.value);  //Convert to a more convienent String object
     
         //this.classDump("DataRead(" + str_line.length + ")=" + str_line);

         //Make sure there is data on the line and it is not a comment
         if ((str_line.length > 0) && (str_line.charAt(0) != '#'))
         {
            var  curr_cookie = new cs_Cookie(str_line);
        
            if (curr_cookie.isValid == true)
            {
               //If the cookies in the profile file did not come from this session of the browser
               //  and they are session cookies, then we don't want to swap them in.
               if ((this.cookiesCameFromThisSession == false) && (curr_cookie.isSessionCookie() == true) )
               {
                  this.classDump("Excluding session cookie from swap because we are running a new" +
                                 "browser session (" + curr_cookie.getCookieString() + ")" );
               }
               else
               {
                  //this.classDump("Adding cookie=" + curr_cookie.getCookieUrl().spec + "=>" + curr_cookie.getCookieString());
                  cookie_svc.setCookieString(curr_cookie.getCookieUrl(), 
                                             null, 
                                             curr_cookie.getCookieString(), 
                                             null);
                  i++;  //Increment the valid cookie count
               }
            }
            else
            {
               this.classDump("Non-comment line was invalid => " + str_line);
            }
         }
      } while(hasmore);
   
      this.classDump("Closing");
      istream.close();
   }
   else
   {
      alert("[CookieSwap] Warning, unable to locate file associated with selected profile.\n" +
            "Expected filename=" + this.fileName.leafName + "\n" +
            "Full path=" + this.fileName.path);
      this.classDump("Unable to open " + this.fileName.path);
   }

   this.classDump("Copied " + i + " cookies from the profile to the browser" );

}

//This method will copy all the cookies in the browser's memory to the
// persistent storage of this profile (replacing all that were
// currently in the storage)
CookieProfile.prototype.copyFromBrowser = function()
{
   var cookie_mgr = ffGetCookieManager();
   var cookie_iter = cookie_mgr.enumerator;
   var curr_cookie;
   var i;
   var file_out_stream = this.getEmptyFile();  //Empty file to store the cookies

   for (i=0;cookie_iter.hasMoreElements();i++)
   {
      curr_cookie = cookie_iter.getNext();

      //Cast the cookie (sorry for the "C" term) to an nsICookie
      if (curr_cookie instanceof Components.interfaces.nsICookie)
      {
          var tmp_string;
          var tmp_cookie;
   
          //this.classDump("Constructing new cookie");

          //Conver the cookie to a "cs_Cookie" class so we can get the FileString
          tmp_cookie = new cs_Cookie(curr_cookie);
          //this.classDump("I have the new cookie");

          //Append the cookie to the global cookie store
          tmp_string = tmp_cookie.getCookieFileString() + CS_NEW_LINE;
          file_out_stream.write(tmp_string, tmp_string.length);

          tmp_string = tmp_cookie.getCookieUrl().spec + CS_NEW_LINE + 
                       tmp_cookie.getCookieString() + CS_NEW_LINE;
      }
   }

   //Need to keep track that the cookies in the profile were taken from this
   //  running of the browser session.  See the attribute definition for more
   //  details on this.
   this.cookiesCameFromThisSession = true;

   this.classDump("Copied " + i + " cookies from browser to the profile file");
   file_out_stream.close();
}


// *****************************************************************************
// *                           cs_Cookie Class                                 *
// *                                                                           *
// ************************** Coding Standards *********************************
// *  gMyVariable     - global variable (starts with "g", then mixed case)     *
// *  myVariable      - variables passed into functions                        *
// *  my_variable     - local variable inside of a function                    *
// *  this.myVariable - class attributes/variable (mixed case & always         *
// *                    referenced with "this.")                               *
// *  MyFunction      - functions are always mixed case                        *
// *  MY_CONSTANT     - constants are all caps with underscores                *
// *                                                                           *
// *************************** Revision History ********************************
// *  Name       Date       BugzID  Action                                     *
// *  ---------  ---------  -----   ------                                     *
// *  SteveTine  28Dec2005  12561   Initial Creation                           *
// *  SteveTine  11Jan2006  12720   Fixing the way session cookies are handled *
// *  SteveTine  16Jan2007  Trac9   Changing class name to avoid name clash    *
// *                                                                           *
// ************************* BEGIN LICENSE BLOCK *******************************
// * Version: MPL 1.1                                                          *
// *                                                                           *
// *The contents of this file are subject to the Mozilla Public License Version*
// * 1.1 (the "License"); you may not use this file except in compliance with  *
// * the License. You may obtain a copy of the License at                      *
// * http://www.mozilla.org/MPL/                                               *
// *                                                                           *
// * Software distributed under the License is distributed on an "AS IS" basis,*
// * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License  *
// * for the specific language governing rights and limitations under the      *
// * License.                                                                  *
// *                                                                           *
// * The Original Code is the CookieSwap Mozilla/Firefox Extension             *
// *                                                                           *
// * The Initial Developer of the Original Code is                             *
// * Steven Tine.                                                              *
// * Portions created by the Initial Developer are Copyright (C) 2006          *
// * the Initial Developer. All Rights Reserved.                               *
// *                                                                           *
// * Contributor(s): Steven Tine                                               *
// *                                                                           *
// **************************END LICENSE BLOCK**********************************

//The Date class takes milliseconds, while cookies are stored in seconds.  Use
//  this define to convert from sec to ms.
const SEC_TO_MS_MULT = 1000;
const TAB_FIELD = "\t";

//-------------------cs_Cookie class def---------------------
//  This file contains the definition of the "cs_Cookie" class which
//  provides the ability to input a nsICookie or String consisting of a cookie
//  line in a storage file.  It can then output the cookie in numerous
//  styles:
//  getCookieString-The string style needed by CookieService.setCookieString()
//  getCookieUrl- URI used by CookieService.setCookieString()
//  getCookieFileString-The string style used for storing a cookie in a file
// 
//"cookie" can be a NsICookie or it can be a string that corresponds
//  to the cookie file string returned from a previous instance of
//  this cookie's getCookieFileString() call.
function cs_Cookie(cookie)   
{
   //Define a debug function for the class...change true/false to turn it on/off
   this.classDump=function(s){true ? cookieswap_dbg("[cs_Cookie]" + s) : (s)}

   //This is the way to call the debug function
   this.classDump("START cs_Cookie ctor");

   this.isValid = false;  //Init cookieValid flag to false...the code below will
                                //  change to true if it is found to be valid

   //I'm not sure how to override methods in javascript, so I'll use a run-time
   //  type check to do it
   if (cookie instanceof Components.interfaces.nsICookie)
   {
      //Fill in the attributes of the class based on the attributes of the cookie
      this.expires  = cookie.expires;
      this.host     = cookie.host;
      this.isDomain = cookie.isDomain;
      this.isSecure = cookie.isSecure;
      this.name     = cookie.name;
      this.path     = cookie.path;
      this.policy   = cookie.policy;
      this.status   = cookie.status;
      this.value    = cookie.value;

      this.isValid = true;  //Looks like a good cookie...mark it as valid
   }
   else
   {
      if (cookie.charAt(0) != '#')  //Comment lines start with a "#"
      {
         //Cookie File string format is:
         //  domain <tab> tailmatch <tab> path <tab> secure <tab> expires <tab> name <tab> value
         //   [0]           [1]           [2]         [3]          [4]           [5]        [6]
         var  fields=cookie.split(TAB_FIELD);

         //The split should find at least 6 fields...if not, it is not a valid string
         if (fields.length >= 6)
         {
            this.host     = fields[0];
            this.path     = fields[2];
            this.isSecure = fields[3]=="TRUE" ? true : false;
            this.expires  = fields[4];
            this.isDomain = this.host.charAt(0) == '.' ? true : false;
            this.name     = fields[5];
            this.policy   = null;  //Information is not in the cookieString (I think)
            this.status   = null;  //Information is not in the cookieString (I think)
            this.value    = fields[6];
      
            this.isValid = true;  //Looks like a good cookie...mark it as valid
         }
         else
         {
            this.classDump("Cookie split length is only " + fields.length + " not 6+ in =>" + cookie);
         }
      }
   }

   this.classDump("END cs_Cookie ctor...cookie is " + this.isValid);
}

//Public Methods
//--------------cs_Cookie class methods-------------------
cs_Cookie.prototype.getCookieFileString = function()
{
   this.classDump("START getCookieFileString()");

   //Cookie File format is:
   //  domain <tab> tailmatch <tab> path <tab> secure <tab> expires <tab> name <tab> value
   var cookie_string;

   var tailmatch = this.host.charAt(0) == '.' ? "TRUE" : "FALSE";
   var is_secure = this.isSecure ? "TRUE" : "FALSE"; 
   
   cookie_string = this.host + TAB_FIELD + 
                   tailmatch + TAB_FIELD + 
                   this.path + TAB_FIELD +
                   is_secure + TAB_FIELD +
                   this.expires + TAB_FIELD +
                   this.name + TAB_FIELD +
                   this.value;

   this.classDump("END getCookieFileString()");

   return(cookie_string);
}

//This method returns a string that captures all the attributes of the cookie.  It is a 
//  string that can be used in the setCookieString method of the Cookie Service
cs_Cookie.prototype.getCookieString = function()
{
   this.classDump("START getCookieString()");

   var cookie_string;

   cookie_string = this.name + "=" + this.value + ";";

   //Domain cookies are those that start with ".", like ".google.com"
   if (this.host.charAt(0) == '.')
   {
      cookie_string = cookie_string + "domain=" + this.host + ";";
   }

   //Cookies with an expiration of 0 are "session cookies" that expire at the end of the
   //  session.  Leaving the "expires=" off the string will cause the browser to treat
   //  it as such.
   if (this.expires != 0)
   {
      cookie_string = cookie_string + "expires=" + (new Date(SEC_TO_MS_MULT * this.expires)) + ";";
   }

   cookie_string = cookie_string + "path=" + this.path + ";";

   if (this.isSecure == true)
   {
      cookie_string = cookie_string + "secure;";
   }

   this.classDump("cookie_string=>" + cookie_string + "\nEND getCookieString()");

   return (cookie_string);
}

//This method returns a nsIURI object that is the URL of the cookie
cs_Cookie.prototype.getCookieUrl = function()
{
   this.classDump("START getCookieUrl()");
   var uri = ffGetStandardUrl();

   //In the uri.spec, specify https if secure or http if not
   var http_proto = this.isSecure ? "https://" : "http://";
   uri.spec = http_proto + this.host + this.path;

   this.classDump("uri.spec=>" + uri.spec + "\nEND getCookieUrl()");

   return(uri);
}

//This method will return if the cookie is a "session" cookie (on that expires
//  at the end of the session) or not
cs_Cookie.prototype.isSessionCookie = function()
{
   //A session cookie is one with an expiration time of 0
   return(this.expires == 0 ? true : false);
}


// *****************************************************************************
// *                           ffComponents                                    *
// * This file provides functions to get easy access to the Mozilla/Firefox(ff)*
// * components (like nsICookieManager and nSICookieService)                   *
// * Obviously these functions aren't doing much work they just help to        *
// * keep the code looking cleaner in the other files.                         *
// * Ideally these would be "C" Macros but I'm not sure how to do that         *
// * in Javascript yet.                                                        *
// *                                                                           *
// ************************** Coding Standards *********************************
// *  gMyVariable     - global variable (starts with "g", then mixed case)     *
// *  myVariable      - variables passed into functions                        *
// *  my_variable     - local variable inside of a function                    *
// *  this.myVariable - class attributes/variable (mixed case & always         *
// *                    referenced with "this.")                               *
// *  MyFunction      - functions are always mixed case                        *
// *  MY_CONSTANT     - constants are all caps with underscores                *
// *                                                                           *
// *************************** Revision History ********************************
// *  Name       Date       BugzID  Action                                     *
// *  ---------  ---------  -----   ------                                     *
// *  SteveTine  2005Dec28  12561   Initial Creation                           *
// *                                                                           *
// ************************* BEGIN LICENSE BLOCK *******************************
// * Version: MPL 1.1                                                          *
// *                                                                           *
// *The contents of this file are subject to the Mozilla Public License Version*
// * 1.1 (the "License"); you may not use this file except in compliance with  *
// * the License. You may obtain a copy of the License at                      *
// * http://www.mozilla.org/MPL/                                               *
// *                                                                           *
// * Software distributed under the License is distributed on an "AS IS" basis,*
// * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License  *
// * for the specific language governing rights and limitations under the      *
// * License.                                                                  *
// *                                                                           *
// * The Original Code is the CookieSwap Mozilla/Firefox Extension             *
// *                                                                           *
// * The Initial Developer of the Original Code is                             *
// * Steven Tine.                                                              *
// * Portions created by the Initial Developer are Copyright (C) 2006          *
// * the Initial Developer. All Rights Reserved.                               *
// *                                                                           *
// * Contributor(s): Steven Tine                                               *
// *                                                                           *
// **************************END LICENSE BLOCK**********************************

function ffGetCookieManager()
{
   return(Components.classes["@mozilla.org/cookiemanager;1"].
                          getService(Components.interfaces.nsICookieManager));
}

function ffGetCookieService()
{
   return(Components.classes["@mozilla.org/cookieService;1"].
                               getService().QueryInterface(Components.interfaces.nsICookieService));

}

function ffGetStandardUrl()
{
   return(Components.classes["@mozilla.org/network/standard-url;1"].createInstance(Components.interfaces.nsIURI));
}

function ffGetDirectoryServiceProvider()
{
   return(Components.classes["@mozilla.org/file/directory_service;1"].createInstance(Components.interfaces.nsIDirectoryServiceProvider));
}

function ffGetFileOutputStream()
{
   return(Components.classes["@mozilla.org/network/file-output-stream;1"].
                              createInstance(Components.interfaces.nsIFileOutputStream));
}


