node ./v2_script_starter_fetch_queue.js > "output.txt"
cat ./output.txt

echo "okundu"
sleep 2
echo "2 saniye beklendi"

content=$(cat ./output.txt | tr -d '[],"')
echo "content alindi" $content
# Köşeli parantezleri ve tek tırnakları kaldır
formatted_input=$(echo $content | tr -d "[]" | tr -d "'" )
echo "formatted_input alindi" $formatted_input

# Virgülü boşluk ile değiştir
formatted_input=$(echo $formatted_input | tr ',' ' ')
echo "formatted_input virgül degisti" $formatted_input

# Diziye dönüştür
IFS=' ' read -r -a array <<< "$formatted_input"
echo "array dizisi olustu" $array

# Dizi elemanlarını ekrana yazdır
for element in "${array[@]}";
do
  echo $element
done
echo "for bitti"