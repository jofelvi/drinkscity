class StoreMailer < ApplicationMailer

	# Subject can be set in your I18n file at config/locales/en.yml
	# with the following lookup:
	#
	#   en.store_mailer.registration.subject
	#
	def registration(store)
		@store = store
		user = store.users.store_admin.first
		mail to: store.legal_agent_email, subject: 'Bienvenido, su registro se ha realizado exitosamente..!!'
	end

	def pending(store)
		@store = store

		mail(

			####################################################################
			# REQUIERE CAMBIARSE CUANDO A ESTO LE DE LA PUTA GANA DE FUNCIONAR #
			####################################################################

			#to: ['matias.vasquez.05@gmail.com', 'matiasvasquez@drinkscity.cl'],
			to: ['dach3r@gmail.com', 'jofelvi07@gmail.com'],
			subject: 'Tienda pendiente por aprobación'
		)
  	end
end
