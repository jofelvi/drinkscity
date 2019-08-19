# == Schema Information
#
# Table name: stores
#
#  id                :integer          not null, primary key
#  user_id           :integer
#  longitude         :float
#  latitude          :float
#  address           :string
#  kind              :integer
#  status            :integer
#  delivery          :boolean
#  name              :string
#  description       :text
#  rut               :string
#  phone             :string
#  email             :string
#  region            :integer
#  days_opened       :string
#  time_opened       :string
#  legal_agent       :string
#  legal_agent_rut   :string
#  legal_agent_phone :string
#  legal_agent_email :string
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  logo              :string
#  logo_file_name    :string
#  logo_content_type :string
#  logo_file_size    :integer
#  logo_updated_at   :datetime
#

class StoreSerializer < ActiveModel::Serializer
  attributes :id, :longitude, :latitude, :address, :description, :kind, :status, :delivery, :name, :description, :rut, :phone, :email,
        :region, :days_opened, :time_opened, :legal_agent, :legal_agent_rut, :legal_agent_phone, :legal_agent_email, :logo
        
  has_many :images
  has_many :products
  has_many :users

  def logo
    object.logo.url
  end

  def images
    { self: object.images.map {|u| u.attributes.merge(:cover_url => u.cover.url)} }
  end

end
