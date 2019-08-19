
class Guest < ApplicationRecord
  # belongs_to :user
  belongs_to :event

  validates :email, presence: true

  after_create :send_email


  private

  def send_email
    # InvitationMailer.invite(self).deliver_now
  end
end
