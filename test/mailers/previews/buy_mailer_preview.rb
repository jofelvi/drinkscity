# Preview all emails at http://localhost:3000/rails/mailers/buy_mailer
class BuyMailerPreview < ActionMailer::Preview

  # Preview this email at http://localhost:3000/rails/mailers/buy_mailer/notify
  def notify
    BuyMailer.notify Order.last
  end

end
