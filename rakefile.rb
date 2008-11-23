require 'rake'
require 'rake/packagetask'

require 'fileutils'

include Rake

ex_path = "/Users/jack/Library/Application Support/Firefox/Profiles/dq92c6iy.development/extensions/"

Name = "forumtool"
Version = "1.0"

class Xpi < PackageTask
  def zip_file
    "#{package_name}.xpi"
  end
end

xpi = Xpi.new(Name, Version){ |p|
    p.need_zip = true
    p.package_files.include "**/*"
 }

@@FileName = xpi.zip_file

task :clean => :clobber do
  FileUtils.rm "#{ex_path}/#{@@FileName}"
end

task :install => [:package] do
  FileUtils.cp "pkg/#{@@FileName}", ex_path
end

task :firefox => :install do
  `firefox_develop`
end

task :default => :install do
end
