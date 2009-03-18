require 'rake'
require 'rake/packagetask'

require 'fileutils'

include Rake

ex_path = "/Users/jack/Library/Application Support/Firefox/Profiles/dq92c6iy.development/extensions"

Name = "forumtool"
Version = "1.0"
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
