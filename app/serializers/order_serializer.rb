# == Schema Information
#
# Table name: orders
#
#  id              :integer          not null, primary key
#  user_id         :integer
#  order_status_id :integer
#  subtotal        :decimal(12, 3)
#  tax             :decimal(12, 3)
#  shipping        :decimal(12, 3)
#  payment_id      :string
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  validated       :boolean          default(FALSE)
#  validator_id    :integer
#  buy_order       :string
#  store_id        :integer
#

class OrderSerializer < ActiveModel::Serializer
  attributes :id, :order_status_id, :payment_id, :subtotal
  has_many :order_items

  belongs_to :user

  def order_items
    { order_items: object&.order_items.map { |e| {name: e.item.name, quantity: e.quantity, unit_price: e.unit_price, item_id: e.item_id, item_type: e.item_type}  } }
  end
end
