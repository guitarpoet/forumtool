require 'rake'
require 'rake/packagetask'

require 'fileutils'

include Rake

ex_path = "/Users/jack/Library/Application Support/Firefox/Profiles/dq92c6iy.development/extensions"

Name = "forumtool"
Version = "0.2"
ID = "forumtool@gopha.com.cn"
Path = "#{ex_path}/#{ID}"

task :clean do
	puts "Remove the file at #{Path}"
	if File.exists? Path
		FileUtils.rm_r Path
	end
end

task :install => :clean do
	puts "Installing file to #{ex_path}"
	FileUtils.cp_r ".", Path
end

task :firefox => :install do
  `firefox_develop`
end

task :default => :install do
end

Rake::PackageTask.new(Name, Version) do |p|
  p.need_zip = true
  p.package_files.include("**/*")
end

desc "Release task"
task :release => [:clobber, :package] do
  FileUtils.cp "pkg/#{Name}-#{Version}.zip", "pkg/#{Name}-#{Version}.xpi"
end