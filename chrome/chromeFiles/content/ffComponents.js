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

