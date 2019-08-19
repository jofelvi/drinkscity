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

class ProductSerializer < ActiveModel::Serializer
  attributes :id, :name, :user_id, :price, :active, :category, :description, :start_datetime, :end_datetime, :stock, :image
  belongs_to :store
  
  def image
    object.image.url
  end
end
