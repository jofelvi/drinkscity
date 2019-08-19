class AddFieldToOrders < ActiveRecord::Migration[5.1]
  def change
  	add_column :orders, :recipient_name, :string
  	add_column :orders, :address, :string
  end
end
