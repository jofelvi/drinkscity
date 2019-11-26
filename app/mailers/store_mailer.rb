class StoreMailer < ApplicationMailer

	# Subject can be set in your I18n file at config/locales/en.yml
	# with the following lookup:
	#
	#   en.store_mailer.registration.subject
	#
	def registration(store)
		store = store
		user = User.with_role(:admin).first
		#mail(to: "test@gmail.com", subject: 'Bienvenido, su registro se ha realizado exitosamente..!!')
		mail to: store.legal_agent_email, subject: 'Bienvenido, su registro se ha realizado exitosamente..!!'
	end

	def pending(store)
		@store = store

		mail(
			to: ['matias.vasquez.05@gmail.com', 'jofelvi07@gmail.com'],
			subject: 'Tienda pendiente por aprobación'
		)
  	end
end
