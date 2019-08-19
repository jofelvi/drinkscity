# Preview all emails at http://localhost:3000/rails/mailers/store_mailer
class StoreMailerPreview < ActionMailer::Preview

  # Preview this email at http://localhost:3000/rails/mailers/store_mailer/registration
  def registration
    StoreMailer.registration Store.last
  end

  # Preview this email at http://localhost:3000/rails/mailers/store_mailer/pending
  def pending
    StoreMailer.pending Store.last
  end

end
