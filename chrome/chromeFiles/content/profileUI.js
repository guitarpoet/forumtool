// *****************************************************************************
// *                           ProfileUI Class                                 *
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
// *  SteveTine  31Jan2007  Trac4   Exchange CookieSwap term in statusbar with icon *
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
var gProfileUI_instance = null;

//-------------ProfileUI class definition--------------
//The ProfileUI class handles displaying all the Profile information to the User Interface.  
//  This class enables you to change the way the profiles are displayed or presented to the 
//  user without affecting the backend.  This class will call the registered function when 
//  the user selects a new profile
//This class is a singleton, so there is only one in existance.  Use the
//  ProfileUI_getInstance() function to get the instance of the class.
function ProfileUI()
{
   //Define a debug function for the class...change true/false to turn it on/off
   this.classDump=function(s){true ? cookieswap_dbg("[ProfileUI]" + s) : (s)}

   //This is the way to call the debug function
   this.classDump("START ctor");

   //---Define some attributes

   //This is the item that users see in the status bar...its name should include the
   //  active profile
   this.cookieStatusBar = document.getElementById('cookieswap-label');

   //Get the cookie-element-list which is the popup menu in the status bar
   this.cookieElemList = document.getElementById('cookie-element-list');

   //Get the seperator between the proifle names and the functions.  This separator
   //  is the divider between the profile names and the options.  So, insert all the
   //  profile before this separator.
   this.profileSeparator = document.getElementById("cookie-profile-list-separator");

   //This attribute holds the pointer to the function that the caller of this class
   //  wants to be called when the user selects a profile on the UI.
   //Default it to null until a user registers their callback with the class.
   this.profileSelectedCallback = null;

   this.classDump("END ctor");
}

//---------Static Methods-------------

//Publically available method to get the singleton instance of the ProfileUI class
function profileUI_getInstance()
{
   if (gProfileUI_instance == null)
   {
      //If this is the first time this method is being called, create the singleton
      //  instance of the class and return it.
      gProfileUI_instance = new ProfileUI();
      cookieswap_dbg("Created singleton instance of ProfileUI\n");
   }

   return gProfileUI_instance;
}

//This static method is called by the browser when a user selects a profile from the menu
function profileUI_profileSelected(menuitem)
{
   var  profileIdSelected = menuitem.getAttribute("label");
   var  profileUi = profileUI_getInstance();

   profileUi.classDump("New profile selected: " + menuitem.label + "(" + profileIdSelected + ")");

   if (profileUi.profileSelectedCallback != null)
   {
      //A callback is registred for this event...call it
      profileUi.classDump("Invoking callback");
      profileUi.profileSelectedCallback(profileIdSelected);
   }
   else
   {
      profileUi.classDump("new profile selected but no callback exists");
   }
}

//---------Public Methods-------------

//Allow caller to register a callback that is called when a user selects a
// profile on the UI.
ProfileUI.prototype.registerProfileSelectedCallback = function(callback)
{
   this.profileSelectedCallback = callback;
   this.classDump("Caller registered callback");
}

//This method will add a profile to the UI list.
//  profileName  - descriptive string of the profile
//  profileID    - ID associated with the profile
ProfileUI.prototype.addProfileToList = function(profileName, profileID)
{
   var  new_profile;

   //We'll create a new menuitem for the profile
   new_profile = document.createElement("menuitem");
   new_profile.setAttribute("id", "profile:" + profileName);
   new_profile.setAttribute("label", profileName);
   new_profile.setAttribute("type", "checkbox");
   new_profile.setAttribute("checked", false);
   new_profile.setAttribute("class", "cookie-profile");
   new_profile.setAttribute("profileId", profileID);
   new_profile.setAttribute("oncommand", "profileUI_profileSelected(this);");
      
   this.classDump("Inserting '" + profileName + "'");

   //Insert the new profile just before the separator so that this profile
   //  would be after all the existing profile
   this.cookieElemList.insertBefore(new_profile, this.profileSeparator);
}   

//This method will remove the selected profile from the UI list
ProfileUI.prototype.removeProfileFromList = function(profileID)
{
//---[TODO] NOT IMPLEMENTED YET---
   this.classDump("UNIMPLEMENTED FUNCTION CALLED...removeProfileFromList");
}

//This method will show the selected profile as active in the UI list
ProfileUI.prototype.showProfileAsActive = function(profileID)
{
   var profile_menu;

   this.classDump("Setting " + profileID + " as active...first uncheck all");

   this.uncheckAll();

   //We need to get the profile_menu item out of the menu so we can get
   //  the name of the profile and set it to checked.
   profile_menu = this.getMenuItem(profileID);
   
   this.classDump("Finished getMenuItem");

   if(profile_menu != null)
   {
      //Set the checkbox on the profile and put the profile name in the StatusBar
      profile_menu.setAttribute("checked", true);
      this.cookieStatusBar.setAttribute("value", profile_menu.getAttribute("label"));
      this.classDump("Handled active profile");
   }
   else
   {
      //TODO...define INVALID_PROFILE_ID in this scope
      //Passing in the INVALID_PROFILE_ID is normal (to deselect any profile).  If we
      //  ended up here for another reason it is an unexpected error
      if (profileID != INVALID_PROFILE_ID)
      {
         this.classDump("ERROR-UNABLE TO FIND MENUTIEM FOR '" + profileID + "'");
      }

      //[TODO]Should uncheck the current profile and change the statusbar to just CookieSwap:
      //  Probably should keep track of currActive and deselect it first then try to
      //  select the new profile
   }
}

//This private method will return the menu item matching the profileID passed in.
//  If no menu item is found, null is returned
ProfileUI.prototype.getMenuItem = function(profileID)
{
   var  menu_items;
   var  profile_item;
      
   this.classDump("Searching for elementByAttribute");

   menu_items = this.cookieElemList.getElementsByAttribute("label", profileID);
   
   this.classDump("Finished searching for elementByAttribute");

   if (menu_items != null)
   {
      //We found the menu item, but it is possible that item 0 is null
      this.classDump("Found a menu mathing profileID");
      profile_item = menu_items[0];
   }
   else
   {
      this.classDump("No menu found matching profileID");
      profile_item = null;
   }

   return profile_item
}

//Uncheck all profiles in the menulist
ProfileUI.prototype.uncheckAll = function()
{
   var  checked_items;
      
   this.classDump("Unchecking all profiles");

   checked_items = this.cookieElemList.getElementsByAttribute("checked", true);
   
   this.classDump("Finished searching for elementByAttribute");

   if (checked_items != null)
   {
      for(var i=0; i<checked_items.length; i++)
      {
         if (checked_items[i] != null)
         {
            this.classDump("Unchecking " + checked_items[i].getAttribute("label"));
            checked_items[i].setAttribute("checked", false);
         }
         else
         {
            this.classDump("Item " + i + " was unexpectedly null...");
         }
      }
   }
}

//This method will have the UI indicate that CookieSwap is not active in
// this browser window
ProfileUI.prototype.showBrowserAsInactive = function()
{
      this.cookieStatusBar.setAttribute("value", "");
}

