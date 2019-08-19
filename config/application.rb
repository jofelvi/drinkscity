require_relative 'boot'

require 'rails/all'

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module Drinkscity
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 5.1

    config.autoload_paths << Rails.root.join('lib')
    config.eager_load_paths << Rails.root.join("lib")
	    # Where the I18n library should search for translation files
	I18n.load_path += Dir[Rails.root.join('lib', 'locale', '*.{rb,yml}')]
	 
	# Whitelist locales available for the application
	I18n.available_locales = [:en, :es]
	 
	# Set default locale to something other than :en
	I18n.default_locale = :es
    # Settings in config/environments/* take precedence over those specified here.
    # Application configuration should go into files in config/initializers
    # -- all .rb files in that directory are automatically loaded.

    config.time_zone = 'Caracas'
    config.i18n.default_locale = :es
    config.encoding = 'utf-8'

    #config.action_controller.asset_host = 'http://localhost:3000/'

    #config.action_mailer.default_url_options = { host: 'http://localhost:3000/' }
    #config.action_mailer.asset_host = 'http://localhost:3000/'

    config.to_prepare do
        Devise::SessionsController.layout "client"
        Devise::RegistrationsController.layout "client"
        Devise::ConfirmationsController.layout "client"
        Devise::UnlocksController.layout "client"
        Devise::PasswordsController.layout "client"
    end

    #config.action_mailer.delivery_method = :smtp
    #config.action_mailer.smtp_settings = {
    #    address:              'smtp.gmail.com',
    #    port:                 587,
    #    domain:               'example.com',
    #    user_name:            'notificacion.stm.joma@gmail.com',
    #    password:             'joma123456',
    #    authentication:       'plain',
    #    enable_starttls_auto: true
    #}

  end
end
