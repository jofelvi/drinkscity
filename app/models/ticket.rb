# == Schema Information
#
# Table name: tickets
#
#  id                 :integer          not null, primary key
#  event_id           :integer
#  name               :string
#  price              :float
#  stock              :integer
#  kind               :integer
#  active             :boolean
#  start_date         :datetime
#  end_date           :datetime
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#  image_file_name    :string
#  image_content_type :string
#  image_file_size    :integer
#  image_updated_at   :datetime
#

class Ticket < ApplicationRecord
	has_many :order_items, as: :item
	belongs_to :event

	validates :name, presence: true
	validates :price, presence: true
  validates :stock, presence: true
  validates :start_date, presence: true
	validates :end_date, presence: true
  has_and_belongs_to_many :users


	has_attached_file :image, styles: {medium: "800x600", thumb: "318x200", mini: "256x256"}, default_url: "https://s3.amazonaws.com/drinkcitybucket/entrada.png"
  	validates_attachment_content_type :image, content_type: /\Aimage\/.*\Z/

  	scope :active, -> { where(active: true) }
  	scope :inactive, -> { where(active: false) }
  	scope :vigente, -> { where('start_date <= ? AND end_date >= ?', Date.today, Date.today) }

  	before_create :set_active

  	private

  		def set_active
  			self.active = true
  		end
	
end
