# == Schema Information
#
# Table name: events
#
#  id             :integer          not null, primary key
#  store_id       :integer
#  user_id        :integer
#  priority       :integer
#  name           :string
#  category       :integer
#  active         :boolean
#  description    :text
#  start_datetime :datetime
#  end_datetime   :datetime
#  video_link     :string
#  address        :string
#  latitude       :string
#  longitude      :string
#  created_at     :datetime         not null
#  updated_at     :datetime         not null
#

class GuestSerializer < ActiveModel::Serializer
  attributes :id, :name, :email, :event_id
  
end
