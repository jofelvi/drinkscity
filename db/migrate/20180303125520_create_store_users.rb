class CreateStoreUsers < ActiveRecord::Migration[5.1]
  def change
    create_table :stores_users do |t|
      t.belongs_to :user, index: true
      t.belongs_to :store, index: true
    end
  end
end
