# Preview all emails at http://localhost:3000/rails/mailers/buy_mailer
class ChatMailerPreview < ActionMailer::Preview

  # Preview this email at http://localhost:3000/rails/mailers/buy_mailer/notify
  def notify
    ChatMailer.notify(ChatRoom.last)
  end

end
