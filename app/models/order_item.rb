# == Schema Information
#
# Table name: order_items
#
#  id          :integer          not null, primary key
#  order_id    :integer
#  unit_price  :decimal(12, 3)
#  quantity    :integer
#  total_price :decimal(12, 3)
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  item_type   :string
#  item_id     :integer
#

class OrderItem < ApplicationRecord
  belongs_to :order
  belongs_to :item, polymorphic: true
  validates :quantity, presence: true, numericality: { only_integer: true, greater_than: 0 }
  validate :order_present
  before_save :finalize

  def unit_price
    if persisted?
      self[:unit_price]
    else
      item.price
    end
  end

  def total_price
    unit_price * quantity
  end

private
  def order_present
    if order.nil?
      errors.add(:order, "no es una orden valida.")
    end
  end

  def finalize
    self[:unit_price] = unit_price
    self[:total_price] = quantity * self[:unit_price]
  end
end
