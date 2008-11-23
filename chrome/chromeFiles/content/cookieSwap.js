// *****************************************************************************
// *                          cookieSwap.js                                    *
// * These are the functions that glue all the CookieSwap classes together.    *
// *  It acts as the dividing line between the front-end and back-end.         *
// * It is the high level code that coordinates the cookie swaps.              *
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
// *  SteveTine  15Jan2005  12751   Stop-gap solution to multiple window prob  *
// *  SteveTine  18Jan2005  12855   Prompt the user before removing all cookies*
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

//This constant defines if debug to stdout is enable or not.
const COOKIE_SWAP_DEBUG_ENABLED=false;
var   gExtensionActive=true;

//Since the CookieSwapProfileManager is a Singleton Service, store it as a global
//  once instantiated
var   gCsProfileMgr=null;

//Called only once at browser startup
function cookieswap_init(event)
{
   cookieswap_dbg("START cookieswap_init");
   
   //Deregister this init function since we only want to run it once
   window.removeEventListener("load", cookieswap_init, true);

   var profile_UI = profileUI_getInstance();

   // instantiate CookieSwap profile manager component object
   gCsProfileMgr = Components.classes["@cookieswap.mozdev.org/profile/manager-service;1"].
                             getService(Components.interfaces.nsIProfile);
   cookieswap_dbg("Created ProfileMgr Service");

   //Register the window observer
   var observer = new cookieswap_Observer();

   //Set the global var to indicate that cookieSwap is active in this browser
   //TODO: Dump this var
   gExtensionActive=true;
      
   //Register the function that is to be called when a user selected to
   //  change the profile
   profile_UI.registerProfileSelectedCallback(cookieswap_profileChangeSelected);

   var obj = Object();
   var profile_array;

   //obj.value is the count, profile_array is the array
   cookieswap_dbg("calling csProfileMgr.getProfileList");
   profile_array = gCsProfileMgr.getProfileList(obj);
   
   cookieswap_dbg("ProfileMgr says " + obj.value + " profiles exist");
   //Populate the UI with the profiles available
   for(var i=0; i<obj.value; i++)
   {
      cookieswap_dbg("adding profile:" + profile_array[i]);
      profile_UI.addProfileToList(profile_array[i], i);
   }

   //Show the currently active profile as active on the UI
   profile_UI.showProfileAsActive(gCsProfileMgr.currentProfile);

   cookieswap_dbg("END cookieswap_init");
}

//This function is registered with the ProfileUI class and is called
//  whenever the user selects a new cookie profile (or the same profile)
//In the case where the same profile is selected, the cookies are copied
//  to the profile storage area.
function cookieswap_profileChangeSelected(profileID)
{
   cookieswap_dbg("START switchProfile to " + profileID);

   gCsProfileMgr.currentProfile = profileID;

   //The only reason this should fail is if the ProfileManager 
   //  couldn't swap to the requested profile
   if (gCsProfileMgr.currentProfile != profileID)
   {
      alert("[cookieswap] Internal error, swap not successful");
   }
   
   cookieswap_dbg("END switchProfile");
}

function cookieswap_runGeneric()
{
   var dnsCacheVal;

   cookieswap_dbg("START runGeneric()");

   //This was something that I was playing with to flush the Firefox DNS cache.
   //To flush the cache, set the network.dnsCacheExipration config value to 0 
   //  (invalidating all entries) then set it back to the original value 
   //  (so new entries get cached again). 
   //
   //Obviously this is something that doesn't belong in CookieSwap, but I had a need for
   //  it and didn't feel like writing a new extension just to do this so it is
   //  stuck in here oddly.
   var net_pref = Components.classes['@mozilla.org/preferences-service;1']
                 .getService(Components.interfaces.nsIPrefService);

   net_pref = net_pref.getBranch('network.');
   dnsCacheVal = net_pref.getIntPref('dnsCacheExpiration'); 
   //Setting the exipration to 0 will invalidate all cached entries
   net_pref.setIntPref('dnsCacheExpiration', 0); 
   //Now set the expiration back to the original value to cause entries to
   //  be cached again.
   net_pref.setIntPref('dnsCacheExpiration', dnsCacheVal); 
   cookieswap_dbg("Set network.dnsCacheExpiration to 0 then back to " + dnsCacheVal);

   cookieswap_dbg("END runGeneric()");
}

function cookieswap_UiRemoveAllCookies()
{
   var do_remove = window.confirm("Are you sure you want to remove all the cookies in this profile?");

   //If user was sure, remove the cookies
   if (do_remove == true)
   {
      cookieswap_removeAllCookies();
   }
}

function cookieswap_UiRemoveAllCookiesInAllProfiles()
{
   var do_remove = window.confirm("Are you sure you want to remove all the cookies in all profiles?");

   //If user was sure, remove the cookies
   if (do_remove == true)
   {
      var obj = Object();
      var profile_array;

      //First remove the cookies in browser memory
      cookieswap_removeAllCookies();

      //Get the list of all profiles
      profile_array = gCsProfileMgr.getProfileList(obj);
   
      //Remove the cookies in each profile
      for(var i=0; i<obj.value; i++)
      {
         cookieswap_dbg("Clearing cookies in " + profile_array[i]);
         //The false specifies to delete the contents not the file/profile
         gCsProfileMgr.deleteProfile(profile_array[i], false);
      }

      cookieswap_dbg("All cookies removed");
   }
}
   
function cookieswap_removeAllCookies()
{
   var cookie_mgr = ffGetCookieManager();
   cookie_mgr.removeAll();
   cookieswap_dbg("All cookies removed");
}


function cookieswap_turnOnDebug()
{
   //I don't know the details here...I found this on a Mozilla example web page but it enables
   //  all "dump()" command to be sent to STDOUT and can be seen when firefox.exe is run from a
   //  command window.
   const PREFS_CID      = "@mozilla.org/preferences;1";
   const PREFS_I_PREF   = "nsIPref";
   const PREF_STRING    = "browser.dom.window.dump.enabled";
   try 
   {
       var Pref        = new Components.Constructor(PREFS_CID, PREFS_I_PREF);
       var pref        = new Pref( );
       pref.SetBoolPref(PREF_STRING, true);
   } catch(e) {}

   cookieswap_dbg("Testing STDOUT...debug on!");
}

function cookieswap_statusBarDblClick()
{
//------------------UNIT TEST CODE--------------------------
// This is used for anything right now other than to
// exercise all the methods on the XPCOM component.
// This code is only enabled in DEBUG mode.
//----------------------------------------------------------
if(COOKIE_SWAP_DEBUG_ENABLED == true)
{
  cookieswap_dbg("calling notify");
  Components.classes["@mozilla.org/observer-service;1"]
           .getService(Components.interfaces.nsIObserverService)
           .notifyObservers(null, "cookieswap_swap", "someAdditionalInformationPassedAs'Data'Parameter");
  cookieswap_dbg("called notify");

  // instantiate component object
  var oProfileMgr = Components.classes["@cookieswap.mozdev.org/profile/manager-service;1"].
                               getService(Components.interfaces.nsIProfile);
                               //createInstance(Components.interfaces.nsIProfile);
  cookieswap_dbg("Created ProfileMgr");

  //--cloneProfile
  oProfileMgr.cloneProfile("test");
  cookieswap_dbg("Cloned Profile");

  //--profileCount
  cookieswap_dbg("Profile Count = " + oProfileMgr.profileCount);

  //--createNewProfile
  oProfileMgr.createNewProfile("test1", "test1dir", "", true);

  //--deleteProfile
  oProfileMgr.deleteProfile("test1", true);
  oProfileMgr.deleteProfile("test1", false);

  //--getProfileList
  var obj = Object();
  var profile_array;
  
  profile_array = oProfileMgr.getProfileList(obj);
  cookieswap_dbg("obj.value = " + obj.value);
  cookieswap_dbg("profile_array[0] = " + profile_array[0]);
  cookieswap_dbg("profile_array[1]= " + profile_array[1]);

  //--profileExists
  cookieswap_dbg("test exists = " + oProfileMgr.profileExists("test"));
  cookieswap_dbg("test1 exists = " + oProfileMgr.profileExists("test1"));

  //renameProfile
  oProfileMgr.renameProfile("test", "test2");

  //shutDownCurrentProfile
  oProfileMgr.shutDownCurrentProfile(Components.interfaces.nsIProfile.SHUTDOWN_PERSIST);
  oProfileMgr.shutDownCurrentProfile(Components.interfaces.nsIProfile.SHUTDOWN_CLEANSE);

  cookieswap_dbg("currentProfile = " + oProfileMgr.currentProfile);
  oProfileMgr.currentProfile = "test1";
  cookieswap_dbg("currentProfile = " + oProfileMgr.currentProfile);
  oProfileMgr.currentProfile = "test2";
  cookieswap_dbg("currentProfile = " + oProfileMgr.currentProfile);
}
}

function cookieswap_dbg(str)
{
   if(COOKIE_SWAP_DEBUG_ENABLED == true)
  {
      //To log to the javascript console (Tools->Error Console) use these lines
      //var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
      //                           .getService(Components.interfaces.nsIConsoleService);
      //consoleService.logStringMessage("[cookieswap]" + str );

      dump("[cookieswap]" + str + "\n");

   }
}

function cookieswap_manageProfiles()
{
   var profile_ctnr = CookieProfileContainer_getInstance();

   alert("Sorry...this feature will be in a future release.\n" +
         "Until then, you can add, delete and rename profiles by closing the broswer and \n" +
         "changing the filenames in this dir:\n" +
          profile_ctnr.profileDir.path + "\n" +
          "On Windows, some of these directories may be hidden.  Use Tools->FolderOptions->View->ShowHiddenFilesAndFolders\n" +
          "in the Windows file explorer window to see these hidden directories.\n\n" +
          "See http://cookieswap.mozdev.org/help.html for detailed instructions.\n");
}

function cookieswap_Observer()
{
  this.register();
}
cookieswap_Observer.prototype = {
  observe: function(subject, topic, data) {
   // Do your stuff here.
   cookieswap_dbg("Observer called! " + data);
   //TODO, getInstance feels heavy here
   var profile_UI = profileUI_getInstance();
   profile_UI.showProfileAsActive(data);
  },
  register: function() {
    var observerService = Components.classes["@mozilla.org/observer-service;1"]
                          .getService(Components.interfaces.nsIObserverService);
    observerService.addObserver(this, "cookieswap_swap", false);
  },
  unregister: function() {
    var observerService = Components.classes["@mozilla.org/observer-service;1"]
                            .getService(Components.interfaces.nsIObserverService);
    observerService.removeObserver(this, "cookieswap_swap");
  }
}


