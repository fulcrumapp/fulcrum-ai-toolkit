# frozen_string_literal: true

require "find"

module FileContracts
  module_function

  def files_under(root)
    return [] unless File.directory?(root)

    files = []
    Find.find(root) do |path|
      files << path if File.file?(path)
    end
    files.sort
  end

  def read_text(path)
    File.binread(path).encode("UTF-8", invalid: :replace, undef: :replace)
  end
end
