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
