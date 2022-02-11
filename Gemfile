source 'https://rubygems.org'
ruby '2.4.1'

git_source(:github) do |repo_name|
  repo_name = "#{repo_name}/#{repo_name}" unless repo_name.include?("/")
  "https://github.com/#{repo_name}.git"
end


## Bundle edge Rails instead: gem 'rails', github: 'rails/rails'
gem 'rails', '~> 5.1.4'
# Use Puma as the app server
gem 'puma', '~> 5.6'
# Use SCSS for stylesheets
gem 'sass-rails', '~> 5.0'
# Use Uglifier as compressor for JavaScript assets
gem 'uglifier', '>= 1.3.0'
# See https://github.com/rails/execjs#readme for more supported runtimes
# gem 'therubyracer', platforms: :ruby
gem 'masonry-rails', '0.2.4'
# Use CoffeeScript for .coffee assets and views
gem 'coffee-rails', '~> 4.2'
# Turbolinks makes navigating your web application faster. Read more: https://github.com/turbolinks/turbolinks
gem 'turbolinks', '~> 5'
# Build JSON APIs with ease. Read more: https://github.com/rails/jbuilder
gem 'jbuilder', '~> 2.5'
# Use Redis adapter to run Action Cable in production
gem 'redis', '~> 3.0'
# Use ActiveModel has_secure_password
# gem 'bcrypt', '~> 3.1.7'

# Use Capistrano for deployment
# gem 'capistrano-rails', group: :development

gem "janus_gateway"


group :development, :test do
  gem 'pg', '~> 0.18.4'
  # Call 'byebug' anywhere in the code to stop execution and get a debugger console
  gem 'byebug', platforms: [:mri, :mingw, :x64_mingw]
  # Adds support for Capybara system testing and selenium driver
  gem 'capybara', '~> 2.13'
  gem 'selenium-webdriver'
end

group :development do
  # Access an IRB console on exception pages or by using <%= console %> anywhere in the code.
  gem 'web-console', '>= 3.3.0'
  gem 'listen', '>= 3.0.5', '< 3.2'
  # Spring speeds up development by keeping your application running in the background. Read more: https://github.com/rails/spring
  gem 'spring'
  gem 'spring-watcher-listen', '~> 2.0.0'
  gem 'annotate'
end

group :production do
  gem 'pg', '~> 0.18.4'
end

# Windows does not include zoneinfo files, so bundle the tzinfo-data gem
gem 'tzinfo-data', platforms: [:mingw, :mswin, :x64_mingw, :jruby]

# ******************************************************************************************************************
# para el login y registro de usuarios
gem 'devise'
gem 'omniauth-facebook'
gem 'omniauth-google-oauth2'

# Para el control de usuarios
gem "rolify"
gem "pundit"

# plantilla gentellela
gem 'jquery-rails'
gem 'gentelella-rails'
gem 'modernizr-rails'

# layouts client
gem "font-awesome-rails"
gem 'bootstrap-sass', '~> 3.3.7'

#
gem 'geocoder'
#
gem 'gmaps4rails'
gem 'underscore-rails'

gem "paperclip", "~> 5.0.0"
gem 'aws-sdk', '~> 2.3'
gem "paperclip-ffmpeg", "~> 1.2.0"
gem "paperclip-av-transcoder", "~> 0.6.4"

gem 'active_model_serializers'

gem 'rails_12factor', group: :production

gem 'khipu-api-client'
gem 'transbank-webpay'
gem 'transbank-oneclick'

gem 'momentjs-rails', '>= 2.9.0'
gem 'bootstrap3-datetimepicker-rails', '~> 4.17.47'

# para el envio de correo electronico
gem 'delayed_job_active_record'

# boton de compartir en una red social
gem 'social-share-button'

gem 'acts_as_favoritor'


gem 'jwt'
gem 'simple_command'

gem 'pry'

gem 'jquery-inputmask-rails'

gem "cocoon"

gem 'foundation-rails'

gem 'ratyrate'

gem 'airbrake'

# para el login con cualquier(miltiple proveedor)
# docs https://github.com/omniauth/omniauth/wiki/Managing-Multiple-Providers
# docs http://blog.railsrumble.com/2010/10/08/intridea-omniauth/
# gem 'omniauth'
