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

class Event < ApplicationRecord
	acts_as_favoritable
	include Imageable
	geocoded_by :address               # can also be an IP address

	has_many :products, as: :item, dependent: :destroy
	has_many :tickets, dependent: :destroy
	has_many :guests, dependent: :destroy
	belongs_to :store
	belongs_to :user

	# Validations fields
	validates_presence_of :name, :address, :description, :category, :start_datetime, :end_datetime

	after_validation :geocode

	accepts_nested_attributes_for :products,
	reject_if: proc { |attributes| attributes['name'].blank?; attributes['price'].blank? }, 
	allow_destroy: true

	accepts_nested_attributes_for :tickets, reject_if: :all_blank, allow_destroy: true

	attr_accessor :product_stk

	enum category: [ :electronica, :evento_cultural, :otros]

	before_create :default_active	
	before_save :set_fecha_products

	scope :active, -> { where(active: true) }
	scope :inactive, -> { where(active: false) }
	scope :vigente, -> { where('end_datetime >= ?', Date.today) }

	private

	def set_fecha_products
		self.products.each do |product|
			product.start_datetime = self.start_datetime
			product.end_datetime = self.end_datetime
		end
	end

	def default_active
		self.active ||= true
	end
end
