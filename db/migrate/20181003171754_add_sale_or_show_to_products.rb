class AddSaleOrShowToProducts < ActiveRecord::Migration[5.1]
  def change
  	add_column :products, :sale_or_show, :boolean
  end
end
