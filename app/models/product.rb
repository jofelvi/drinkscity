# == Schema Information
#
# Table name: products
#
#  id                 :integer          not null, primary key
#  user_id            :integer
#  name               :string
#  price              :decimal(12, 3)
#  active             :boolean
#  category           :integer
#  priority           :integer
#  description        :text
#  start_datetime     :datetime
#  end_datetime       :datetime
#  stock              :integer
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#  item_type          :string
#  item_id            :integer
#  image_file_name    :string
#  image_content_type :string
#  image_file_size    :integer
#  image_updated_at   :datetime
#

class Product < ApplicationRecord
	acts_as_favoritable

	belongs_to :item, polymorphic: true, optional: true
	has_many :order_items, as: :item
	belongs_to :user

	has_many :comments#, -> { order 'created_at desc' }

	validates :name, presence: true
	validates :price, presence: true
	validates :description, presence: true
	validates :category, presence: true
	validates :stock, presence: true

	has_attached_file :image, styles: {large: "2600x600", medium: "800x600", thumb: "318x200", mini: "256x256"}, default_url: "https://s3.amazonaws.com/drinkcitybucket/product.jpg"
	validates_attachment_content_type :image, content_type: /\Aimage\/.*\Z/

	enum priority: [ :aviso_standar, :oferta_del_momento, :promocion, :aviso_destacado, :aviso_vip_slider_principal, :evento]
	enum category: [ :licores, :cervezas, :vinos, :tragos_preparados, :insumos, :habitaciones, :comida]

	# default_scope { where(active: true) }
	scope :active, -> { where(active: true) }
  	scope :list_store, -> { where( item_type: 'Store') }
  	scope :vigente, -> { where('start_datetime <= ? AND end_datetime >= ?', Date.today, Date.today) }
  	scope :active, -> { where(active: true) }
  	scope :inactive, -> { where(active: false) }

	before_create :default_active

	ratyrate_rateable 'quality'


	def store?
		if self.item_type == 'Store'
			true
		else
			false
		end
	end

	def store
		self.item if self.item_type == 'Store'
	end

	def event?
		if self.item_type == 'Event'
			true
		else
			false
		end
	end

	def event
		self.item if self.item_type == 'Event'
	end

	private 

		def default_active
			self.active ||= true
		end
	
end
