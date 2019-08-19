class CreateProducts < ActiveRecord::Migration[5.1]
  def change
    create_table :products do |t|
      t.references :user, foreign_key: true
      t.references :item, polymorphic: true, index: true
      t.string :name
      t.decimal :price, precision: 12, scale: 3
      t.boolean :active
      t.integer :category
      t.integer :priority
      t.text :description
      t.datetime :start_datetime
      t.datetime :end_datetime
      t.integer :stock
      t.attachment :image

      t.timestamps
    end
  end
end
