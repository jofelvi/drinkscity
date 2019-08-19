# == Schema Information
#
# Table name: chat_rooms
#
#  id         :integer          not null, primary key
#  title      :string
#  user_id    :integer
#  created_at :datetime         not null
#  updated_at :datetime         not null
#

class ChatRoom < ApplicationRecord
  belongs_to :user
  has_many :messages, dependent: :destroy
end
