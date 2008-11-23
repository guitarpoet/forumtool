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

const INVALID_PROFILE_ID=-1;
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
               this.activeProfileId = i;
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
CookieProfileContainer.prototype.getProfileName = function(profileId)
{
   if (profileId < this.profileArray.length)
   {
      return(this.profileArray[profileId].name);
   }
   else
   {
      this.classDump("Invalid ID (" + profileId + ") passed in to getProfileName of " + this.profileArray.length);
      return(null);
   }
}

//This method returns a CookieProfile class object corresponding to the profileID
//  passed in.  If not profile with that profileID exists, null is returned.
CookieProfileContainer.prototype.getProfile = function(profileId)
{
   if (profileId < this.profileArray.length)
   {
      return(this.profileArray[profileId].profile);
   }
   else
   {
      this.classDump("Invalid ID (" + profileId + ") passed in to getProfile of " + this.profileArray.length);
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

      if (profileId < this.activeId)
      {
         //All profileID above the profileId passed in have been
         //  shifted down by one.  If the activeProfileId was shifted
         //  the adjust it down.
         this.activeProfileId--;
      }
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
CookieProfileContainer.prototype.setActiveProfileId = function(profileId)
{
   this.classDump("START setActiveProfileId( " + profileId + ")");

   //If the currently active profile is valid, rename that profile's filename to indicate
   //  that is no longer the active profile
   if ((this.activeProfileId != INVALID_PROFILE_ID)  && (this.activeProfileId < this.profileArray.length))
   {
      var i = this.activeProfileId;
      var fileHandle = this.profileArray[i].profile.getFileHandle();

      //Renaming to inactive filename
      this.classDump("Renaming " + this.profileArray[i].name + " (old profile)");
      this.profileArray[i].profile.setFileHandle(this.moveFile(fileHandle, COOKIE_FILE_PREFACE + this.profileArray[i].name + "." + INACT_COOKIE_FILE_EXT));
   }

   //If the new profileID is valid, rename that profile's file to indicate that it
   //  is the active profile
   if ((profileId != INVALID_PROFILE_ID)  && (profileId < this.profileArray.length))
   {
      var i = profileId;  //Rename profileId to a shorter var
      var fileHandle = this.profileArray[i].profile.getFileHandle();
         
      //Renaming to active filename
      this.classDump("Renaming " + this.profileArray[i].name + " (new profile)");
      this.profileArray[i].profile.setFileHandle(this.moveFile(fileHandle, COOKIE_FILE_PREFACE + this.profileArray[i].name + "." + ACTV_COOKIE_FILE_EXT));
   }
   else
   {
      this.classDump("Invalid ID passed in to setActiveProfileId");
      profileId = INVALID_PROFILE_ID;  //Non-valid ID passed in, make it INVALID
   }
      
   this.activeProfileId = profileId;
   this.classDump("END setActiveProfileId( " + profileId + ")");
   
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
