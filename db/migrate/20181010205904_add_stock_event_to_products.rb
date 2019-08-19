class AddStockEventToProducts < ActiveRecord::Migration[5.1]
  def change
    add_column :products, :stock_event, :integer
  end
end
