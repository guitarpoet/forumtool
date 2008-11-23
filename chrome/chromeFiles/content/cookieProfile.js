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
   var file_out_stream = ffGetFileOutputStream();

   this.classDump("opening " + this.fileName.leafName + " for writing");
   file_out_stream.init(this.fileName, COOKIE_FILE_WRITE_FLAGS, COOKIE_FILE_PERMISSIONS, 0);

   //Write the header to the file
   tmp_string = COOKIE_FILE_HDR;
   file_out_stream.write(tmp_string, tmp_string.length);

   this.classDump("Header written");

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

