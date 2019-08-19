class InvitationMailer < ApplicationMailer

  # Subject can be set in your I18n file at config/locales/en.yml
  # with the following lookup:
  #
  #   en.store_mailer.registration.subject
  #
  def invite(guest)
    @guest = guest
    @event = Event.find(guest.event_id)

    mail(
      to: guest.email,
      subject: 'Has sido invitado con un pase de cortesioa al evento #{@event.name}'
    )
  end

end
