Pod::Spec.new do |s|
  s.name = 'DevconBle'
  s.version = '1.0.0'
  s.summary = 'Foreground ephemeral peer discovery for Devcon Follow'
  s.description = s.summary
  s.license = { :type => 'MIT' }
  s.author = 'Devcon Follow'
  s.homepage = 'https://github.com/MKVEERENDRA/Devcon-follow'
  s.platforms = { :ios => '15.1' }
  s.swift_version = '5.9'
  s.source = { :git => s.homepage }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,mm,swift}'
  s.frameworks = 'CoreBluetooth'
end
