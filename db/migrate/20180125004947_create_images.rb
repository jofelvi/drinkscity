class CreateImages < ActiveRecord::Migration[5.1]
  def change
    create_table :images do |t|
    	t.references :item, polymorphic: true, index: true
      t.attachment :cover
      t.timestamps
    end
  end
end
