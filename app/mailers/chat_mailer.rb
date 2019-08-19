class ChatMailer < ApplicationMailer

  def notify(chat_room)
  	@chat_room = chat_room
    mail from: 'notificaciones@drinkscity.cl' ,
    	to: 'oscarjosecostero@gmail.com',
    	subject: 'Notificacion de actividad en chat'
  end

end
