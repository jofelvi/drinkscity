# == Schema Information
#
# Table name: images
#
#  id                 :integer          not null, primary key
#  item_type          :string
#  item_id            :integer
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#  cover_file_name    :string
#  cover_content_type :string
#  cover_file_size    :integer
#  cover_updated_at   :datetime
#

class Image < ApplicationRecord
  # belongs_to :product, optional: true
  # belongs_to :event, optional: true
  # belongs_to :store, optional: true

  # has_many :imagenes, :dependent => :destroy

  # belongs_to :noticia


  belongs_to :item, polymorphic: true
  # Validaciones del atributo foto que se esta subiendo
  has_attached_file :cover, styles: {medium: "800x600", thumb: "318x200", mini: "256x256"}, default_url: "https://s3.amazonaws.com/drinkcitybucket/product.jpg"
  validates_attachment_content_type :cover, content_type: /\Aimage\/.*\Z/ 
end
