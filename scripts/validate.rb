#!/usr/bin/env ruby
# frozen_string_literal: true

require "open3"

root = File.expand_path("..", __dir__)
validator = File.join(root, "scripts", "validate.mjs")
stdout, stderr, status = Open3.capture3("node", validator, chdir: root)
print stdout
warn stderr unless stderr.empty?
exit status.exitstatus
