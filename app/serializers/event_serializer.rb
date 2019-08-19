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

class EventSerializer < ActiveModel::Serializer
  attributes :id, :user_id, :priority, :name, :category, :description, :start_datetime, :end_datetime, :video_link, :address
  has_many :images
  has_many :tickets
  has_many :products
  belongs_to :store

  def images
    { self: object.images.map {|u| u.attributes.merge(:cover_url => u.cover.url)} }
  end
end
