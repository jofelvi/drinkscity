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

class Order < ApplicationRecord
  belongs_to :order_status, optional: true
  belongs_to :user, optional: true
  belongs_to :store, optional: true
  belongs_to :validator, class_name: "User", foreign_key: "validator_id", optional: true
  has_many :order_items
  before_create :set_order_status
  before_save :update_subtotal
  before_save :set_store
  after_save :notify_for_email

  def subtotal
    order_items.collect { |oi| oi.valid? ? (oi.quantity * oi.unit_price) : 0 }.sum
  end

  def format_buyorder
    day_orders = Order.where("created_at >= ? AND created_at <= ?", self.created_at.beginning_of_day, self.created_at.end_of_day)
    day_order_number = "%03d" % (day_orders.index{|x| x.id == self.id } + 1)
    buy_order = Time.now.in_time_zone("Santiago").strftime("%Y%m%d%H%M%S")
    buy_order = buy_order + day_order_number
  end

  private
    def set_order_status
      self.order_status_id = 1
    end
    def set_store
      self.store_id = self&.order_items.last.item.store.id
    end

    def notify_for_email
      if self.order_status_id == 3
        begin
          BuyMailer.notify(self).deliver_now
        rescue Exception => e
          p "=============== email error =================="
          p e.inspect
          p "=============================================="
        end
      end
    end

    def update_subtotal
      self[:subtotal] = subtotal
    end
end
